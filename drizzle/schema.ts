import {
  int,
  bigint,
  mysqlEnum,
  mysqlTable,
  index,
  text,
  timestamp,
  varchar,
  decimal,
  double,
  boolean,
  tinyint,
  datetime,
  date,
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
  phone: varchar("phone", { length: 50 }),  // business phone (supports 1-800 toll-free numbers)
  quoWebhookSecret: varchar("quoWebhookSecret", { length: 255 }),  // Quo (OpenPhone) webhook signing secret
  gmailUser: varchar("gmailUser", { length: 320 }),  // Gmail address for sending emails
  gmailAppPassword: varchar("gmailAppPassword", { length: 255 }),  // Gmail app-specific password
  portalDomain: varchar("portalDomain", { length: 320 }),  // Custom domain for portal links (e.g. portal.waypointadvocates.com)
  logoUrl: varchar("logoUrl", { length: 2048 }),  // Custom logo URL for the company
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
  phone: varchar("phone", { length: 50 }),
  company: varchar("company", { length: 200 }),
  jobTitle: varchar("jobTitle", { length: 100 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  zipCode: varchar("zipCode", { length: 20 }),
  country: varchar("country", { length: 100 }),
  notes: text("notes"),
  portalUserId: int("portalUserId"),  // links to users.id when client has a portal account
  portalAccess: varchar("portalAccess", { length: 50 }),  // "active", "apps_only", or null/inactive
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
  secondParentPhone: varchar("secondParentPhone", { length: 50 }),
  secondParentEmail: varchar("secondParentEmail", { length: 320 }),
  // Student-specific fields
  dateOfBirth: varchar("dateOfBirth", { length: 20 }),
  diagnosis: text("diagnosis"),
  iepEligibility: varchar("iepEligibility", { length: 255 }),
  medicalDiagnoses: text("medicalDiagnoses"),
  schoolName: varchar("schoolName", { length: 200 }),
  gradeLevel: varchar("gradeLevel", { length: 50 }),
  countyDistrict: varchar("countyDistrict", { length: 200 }),
  challenges: text("challenges"),
  previousSchool: varchar("previousSchool", { length: 200 }),
  goingToSchool: varchar("goingToSchool", { length: 200 }),
  planType: varchar("planType", { length: 50 }).default("No IEP/504 Yet"),
  // Advocacy Pipeline fields (PG-039)
  pipelineStage: varchar("pipelineStage", { length: 100 }).default("Discovery"),
  planTier: varchar("planTier", { length: 50 }).default("$55"), // "$55", "$105", "Scholarship", "Pay Per Use", "Tools Only", etc.
  accountStatus: varchar("accountStatus", { length: 50 }).default("Active"), // "Active", "Onboarding", "Renewal Needed", "On Hold", "Offboarding", "Closed"
  billingStatus: varchar("billingStatus", { length: 50 }).default("Current"), // "Current", "Payment Failed", "Past Due", "Complimentary", "Not Applicable"
  contractStatus: varchar("contractStatus", { length: 50 }).default("Active"), // "Not Started", "Active", "Ending Soon", "Expired", "Renewed"
  assignedAdvocateName: varchar("assignedAdvocateName", { length: 150 }),
  activeWorkstreams: text("activeWorkstreams"), // JSON array of active workstream tags
  planMonthsRemaining: int("planMonthsRemaining").default(6), // remaining commitment months on active plan
  planExpiresAt: timestamp("planExpiresAt"), // date plan commitment ends

  // Client Journey & Operational Lifecycle System (PG-030)
  lifecycleStage: varchar("lifecycleStage", { length: 50 }).default("Active"), // "Discovery", "Onboarding", "Active", "Renewal", "Offboarding", "Closed"
  operationalState: varchar("operationalState", { length: 50 }).default("Normal"), // "Normal", "Scholarship Pending", "Services Paused", "Payment Attention", "Grace Period", "Pending Closeout"
  serviceStatus: varchar("serviceStatus", { length: 50 }).default("Active"), // "Not Started", "Active", "Paused", "Ending", "Closed"
  portalLifecycleStatus: varchar("portalLifecycleStatus", { length: 50 }).default("Active"), // "Discovery", "Onboarding", "Active", "Limited", "Disabled"
  
  // Dynamic Primary Action & Roadmap
  currentPrimaryAction: varchar("currentPrimaryAction", { length: 255 }),
  currentActionDestination: varchar("currentActionDestination", { length: 255 }),
  currentActionDueDate: varchar("currentActionDueDate", { length: 100 }),
  currentActionHelperText: varchar("currentActionHelperText", { length: 255 }),
  journeyProgress: int("journeyProgress").default(0),
  journeyTotalSteps: int("journeyTotalSteps").default(6),
  
  // Renewal tracking
  renewalDate: varchar("renewalDate", { length: 100 }),
  renewalDaysRemaining: int("renewalDaysRemaining"),
  serviceTermEndsAt: varchar("serviceTermEndsAt", { length: 100 }),
  
  // Pause tracking
  pauseReason: varchar("pauseReason", { length: 255 }),
  pauseStartDate: varchar("pauseStartDate", { length: 100 }),
  pauseReviewDate: varchar("pauseReviewDate", { length: 100 }),
  pauseType: varchar("pauseType", { length: 100 }), // "services_only", "services_and_billing"
  contractTreatment: varchar("contractTreatment", { length: 150 }), // "Paid-in-full time preserved", "Extended service end date"
  pauseApprovedBy: varchar("pauseApprovedBy", { length: 150 }),
  
  // Payment attention & grace period tracking
  paymentFailureDate: varchar("paymentFailureDate", { length: 100 }),
  failedAttemptCount: int("failedAttemptCount").default(0),
  nextRetryDate: varchar("nextRetryDate", { length: 100 }),
  gracePeriodExpiresAt: varchar("gracePeriodExpiresAt", { length: 100 }),
  amountDue: varchar("amountDue", { length: 50 }),
  paymentMethodSummary: varchar("paymentMethodSummary", { length: 150 }),
  
  // Offboarding tracking
  offboardingReason: varchar("offboardingReason", { length: 255 }),
  offboardingRequestedAt: varchar("offboardingRequestedAt", { length: 100 }),
  offboardingEffectiveDate: varchar("offboardingEffectiveDate", { length: 100 }),
  closeoutCompletedBy: varchar("closeoutCompletedBy", { length: 150 }),
  
  // Scholarship & Manager approval tracking
  managerApprovalStatus: varchar("managerApprovalStatus", { length: 50 }), // "pending", "approved", "denied", "more_info_needed"
  approvingManager: varchar("approvingManager", { length: 150 }),
  approvalTimestamp: timestamp("approvalTimestamp"),
  scholarshipNotes: text("scholarshipNotes"),
  // Attorney / Legal representation fields
  attorneyName: varchar("attorneyName", { length: 200 }),
  attorneyPhone: varchar("attorneyPhone", { length: 50 }),
  attorneyEmail: varchar("attorneyEmail", { length: 320 }),
  attorneyFirm: varchar("attorneyFirm", { length: 200 }),
  attorneyAddress: text("attorneyAddress"),
  // Quo (OpenPhone) integration fields
  quoContactId: varchar("quoContactId", { length: 255 }),
  quoSyncStatus: varchar("quoSyncStatus", { length: 50 }).default("not_synced"),
  quoLastSyncAt: timestamp("quoLastSyncAt"),
  quoSyncError: text("quoSyncError"),
  // Archive fields
  archivedAt: timestamp("archivedAt"),
  archiveReason: text("archiveReason"),
  // Time Zone & Calling Intelligence fields (PG-041)
  confirmedTimeZone: varchar("confirmedTimeZone", { length: 64 }),
  timeZoneSource: varchar("timeZoneSource", { length: 50 }).default("Automatically detected"),
  timeZoneConfirmedAt: timestamp("timeZoneConfirmedAt"),
  preferredCallingStartTime: varchar("preferredCallingStartTime", { length: 10 }),
  preferredCallingEndTime: varchar("preferredCallingEndTime", { length: 10 }),
  preferredCallingDays: varchar("preferredCallingDays", { length: 50 }),
  mayCallOutsidePreferredHours: boolean("mayCallOutsidePreferredHours").default(false),
  preferredCommunicationMethod: varchar("preferredCommunicationMethod", { length: 50 }),
  // Geocoding & Location Precision fields (PG-041)
  latitude: varchar("latitude", { length: 50 }),
  longitude: varchar("longitude", { length: 50 }),
  locationAccuracy: varchar("locationAccuracy", { length: 50 }), // "Exact geocode, protected", "ZIP centroid", "City centroid", "County centroid", "State fallback", "Unavailable"
  locationLastUpdated: timestamp("locationLastUpdated"),
  mapLatitude: double("mapLatitude"),
  mapLongitude: double("mapLongitude"),
  mapLocationAccuracy: varchar("mapLocationAccuracy", { length: 50 }), // "zip_centroid" | "city_centroid" | "manual" | "state_centroid" | "unavailable"
  mapLocationSource: varchar("mapLocationSource", { length: 50 }),
  mapLocationUpdatedAt: varchar("mapLocationUpdatedAt", { length: 100 }),
  mapLocationStatus: varchar("mapLocationStatus", { length: 50 }).default("needs_geocoding"), // "ready" | "needs_geocoding" | "needs_review" | "failed"
  isDemoData: boolean("isDemoData").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  ownerIdIdx: index("contacts_ownerId_idx").on(t.ownerId),
  parentContactIdIdx: index("contacts_parentContactId_idx").on(t.parentContactId),
  portalUserIdIdx: index("contacts_portalUserId_idx").on(t.portalUserId),
  jobTitleIdx: index("contacts_jobTitle_idx").on(t.jobTitle),
  caseIdIdx: index("contacts_caseId_idx").on(t.caseId),
}));
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

/**
 * Leads table for sales pipeline tracking.
 * Statuses: New, 14 Day Follow-up, 30 Day Follow-up, 60 Day Follow-up, 90 Day Follow-up, Qualified, Won, Lost
 */
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  contactId: int("contactId"),
  source: varchar("source", { length: 100 }),
  status: mysqlEnum("status", ["New", "14 Day Follow-up", "30 Day Follow-up", "60 Day Follow-up", "90 Day Follow-up", "Ready for Archive", "Won", "Lost"])
    .default("New")
    .notNull(),
  value: decimal("value", { precision: 12, scale: 2 }),
  notes: text("notes"),
  parentName: varchar("parentName", { length: 200 }),
  parentPhone: varchar("parentPhone", { length: 30 }),
  studentName: varchar("studentName", { length: 200 }),
  studentAge: int("studentAge"),
  studentGrade: varchar("studentGrade", { length: 20 }),
  discoveryCallDate: timestamp("discoveryCallDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  ownerIdIdx: index("leads_ownerId_idx").on(t.ownerId),
  contactIdIdx: index("leads_contactId_idx").on(t.contactId),
}));

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
}, (t) => ({
  ownerIdIdx: index("projects_ownerId_idx").on(t.ownerId),
  clientIdIdx: index("projects_clientId_idx").on(t.clientId),
  leadIdIdx: index("projects_leadId_idx").on(t.leadId),
}));

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
  smartFileAssignmentId: int("smartFileAssignmentId"),
  /** Who assigned the task: "manager" | "system_automation" | "self" | "employee" */
  assignmentSource: varchar("assignmentSource", { length: 50 }).default("manager"),
  /** User ID who assigned the task */
  assignedByUserId: int("assignedByUserId"),
  /** Display name of the assigner or automation label */
  assignedByName: varchar("assignedByName", { length: 255 }),
  /** Timestamp when task was first moved to "In Progress" status */
  startedAt: timestamp("startedAt"),
  /** Timestamp when task was marked as "Done" */
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  projectIdIdx: index("projectTasks_projectId_idx").on(t.projectId),
  assignedToUserIdIdx: index("projectTasks_assignedToUserId_idx").on(t.assignedToUserId),
  assignedToIdx: index("projectTasks_assignedTo_idx").on(t.assignedTo),
  statusIdx: index("projectTasks_status_idx").on(t.status),
}));

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
}, (t) => ({
  taskIdIdx: index("projectTaskSteps_taskId_idx").on(t.taskId),
}));
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
}, (t) => ({
  ownerIdIdx: index("invoices_ownerId_idx").on(t.ownerId),
  clientIdIdx: index("invoices_clientId_idx").on(t.clientId),
  projectIdIdx: index("invoices_projectId_idx").on(t.projectId),
}));

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
  caseId: varchar("caseId", { length: 20 }),  // links to contacts.caseId for student appointments
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  startTime: datetime("startTime").notNull(),
  endTime: datetime("endTime").notNull(),
  location: varchar("location", { length: 255 }),
  videoLink: varchar("videoLink", { length: 512 }),
  parentName: varchar("parentName", { length: 255 }),
  parentPhone: varchar("parentPhone", { length: 50 }),
  studentName: varchar("studentName", { length: 255 }),
  status: mysqlEnum("status", [
    "Scheduled",
    "Confirmed",
    "Completed",
    "Cancelled",
  ])
    .default("Scheduled")
    .notNull(),
  meetingType: varchar("meetingType", { length: 100 }),
  clientMeetingLink: varchar("clientMeetingLink", { length: 1024 }),
  // Time Zone Intelligence fields (PG-041)
  originalTimeZone: varchar("originalTimeZone", { length: 64 }).default("America/New_York"),
  clientTimeZone: varchar("clientTimeZone", { length: 64 }),
  schoolTimeZone: varchar("schoolTimeZone", { length: 64 }),
  assignedAdvocateName: varchar("assignedAdvocateName", { length: 150 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  ownerIdIdx: index("appointments_ownerId_idx").on(t.ownerId),
  clientIdIdx: index("appointments_clientId_idx").on(t.clientId),
  caseIdIdx: index("appointments_caseId_idx").on(t.caseId),
}));

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
  status: mysqlEnum("status", ["not_started", "in_progress", "paused", "stuck", "complete"])
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
  /** Who assigned the task: "manager" | "system_automation" | "self" | "employee" */
  assignmentSource: varchar("assignmentSource", { length: 50 }).default("manager"),
  /** User ID who assigned the task */
  assignedByUserId: int("assignedByUserId"),
  /** Display name of the assigner or automation label */
  assignedByName: varchar("assignedByName", { length: 255 }),
  /** Timestamp when task was first moved to "in_progress" status */
  startedAt: timestamp("startedAt"),
  /** Timestamp when task was marked as "paused" */
  pausedAt: timestamp("pausedAt"),
  /** Timestamp when task was marked as "stuck" */
  stuckAt: timestamp("stuckAt"),
  /** Timestamp when task was marked as "complete" */
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  projectIdIdx: index("internalTasks_projectId_idx").on(t.projectId),
  assigneeIdIdx: index("internalTasks_assigneeId_idx").on(t.assigneeId),
  createdByIdx: index("internalTasks_createdBy_idx").on(t.createdBy),
}));

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
}, (t) => ({
  taskIdIdx: index("internalSubtasks_taskId_idx").on(t.taskId),
}));

export type InternalSubtask = typeof internalSubtasks.$inferSelect;
export type InsertInternalSubtask = typeof internalSubtasks.$inferInsert;

// ============ TASK DELETION REQUESTS ============
export const taskDeletionRequests = mysqlTable("taskDeletionRequests", {
  id: int("id").autoincrement().primaryKey(),
  taskType: mysqlEnum("taskType", ["general", "project"]).notNull(),
  taskId: int("taskId").notNull(),
  taskTitle: varchar("taskTitle", { length: 255 }).notNull(),
  taskDescription: text("taskDescription"),
  taskDetails: text("taskDetails"), // JSON snapshot: { assignedTo, dueDate, linkedStudentName, linkedStudentId, projectName, projectId, subtasks, priority }
  requestedByUserId: int("requestedByUserId").notNull(),
  requestedByUserName: varchar("requestedByUserName", { length: 255 }).notNull(),
  reason: text("reason"),
  status: mysqlEnum("status", ["pending", "approved", "declined"]).default("pending").notNull(),
  reviewedByUserId: int("reviewedByUserId"),
  reviewedAt: timestamp("reviewedAt"),
  declineReason: text("declineReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  taskIdIdx: index("taskDeletionRequests_taskId_idx").on(t.taskId),
  statusIdx: index("taskDeletionRequests_status_idx").on(t.status),
  requestedByIdx: index("taskDeletionRequests_requestedByUserId_idx").on(t.requestedByUserId),
}));

export type TaskDeletionRequest = typeof taskDeletionRequests.$inferSelect;
export type InsertTaskDeletionRequest = typeof taskDeletionRequests.$inferInsert;

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

// ============ KB CATEGORIES ============
export const kbCategories = mysqlTable("kbCategories", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type KbCategory = typeof kbCategories.$inferSelect;
export type InsertKbCategory = typeof kbCategories.$inferInsert;

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
}, (t) => ({
  ownerIdIdx: index("timeEntries_ownerId_idx").on(t.ownerId),
  studentIdIdx: index("timeEntries_studentId_idx").on(t.studentId),
}));
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
  // Extended fields for voicemail, recordings, messages, and callbacks
  contactId: int("contactId"),                           // linked contact/parent (in addition to studentId)
  eventType: varchar("eventType", { length: 50 }),       // call.completed, message.received, etc.
  isVoicemail: boolean("isVoicemail").default(false),
  voicemailTranscript: text("voicemailTranscript"),
  recordingUrl: text("recordingUrl"),
  smsBody: text("smsBody"),                              // for message.received events
  rawPayload: json("rawPayload"),                        // full raw event for debugging
  isMissed: boolean("isMissed").default(false),          // true if incoming call was unanswered / missed
  callbackStatus: varchar("callbackStatus", { length: 50 }).default("none"), // "none" | "pending" | "completed" | "dismissed"
  callbackTaskId: int("callbackTaskId"),                 // generated CRM task ID if converted to callback item
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  assignedAt: timestamp("assignedAt"),
}, (t) => ({
  ownerIdIdx: index("callLogs_ownerId_idx").on(t.ownerId),
  studentIdIdx: index("callLogs_studentId_idx").on(t.studentId),
  contactIdIdx: index("callLogs_contactId_idx").on(t.contactId),
}));
export type CallLog = typeof callLogs.$inferSelect;
export type InsertCallLog = typeof callLogs.$inferInsert;

// ============ QUO INTEGRATION SETTINGS ============
export const quoSettings = mysqlTable("quoSettings", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  status: varchar("status", { length: 50 }).default("disconnected").notNull(), // "disconnected" | "connected" | "pending_verification"
  hasApiKey: boolean("hasApiKey").default(false).notNull(), // Secure flag indicating whether backend has API credentials configured
  webhookUrl: text("webhookUrl"),
  webhookSecret: varchar("webhookSecret", { length: 255 }),
  primaryPhoneId: varchar("primaryPhoneId", { length: 255 }),
  primaryPhoneNumber: varchar("primaryPhoneNumber", { length: 50 }),
  primaryPhoneDisplayName: varchar("primaryPhoneDisplayName", { length: 100 }),
  lastSyncAt: timestamp("lastSyncAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  ownerIdIdx: index("quoSettings_ownerId_idx").on(t.ownerId),
}));
export type QuoSettings = typeof quoSettings.$inferSelect;
export type InsertQuoSettings = typeof quoSettings.$inferInsert;

// ============ QUO EMPLOYEE MAPPINGS ============
export const quoEmployeeMappings = mysqlTable("quoEmployeeMappings", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  employeeId: int("employeeId").notNull(),               // links to users.id
  employeeName: varchar("employeeName", { length: 200 }),
  quoUserId: varchar("quoUserId", { length: 255 }).notNull(),
  quoUserDisplayName: varchar("quoUserDisplayName", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  ownerIdIdx: index("quoEmployeeMappings_ownerId_idx").on(t.ownerId),
  employeeIdIdx: index("quoEmployeeMappings_employeeId_idx").on(t.employeeId),
}));
export type QuoEmployeeMapping = typeof quoEmployeeMappings.$inferSelect;
export type InsertQuoEmployeeMapping = typeof quoEmployeeMappings.$inferInsert;

// ============ EMPLOYEE REGISTERED DEVICES (PUSH HANDOFF) ============
export const employeeDevices = mysqlTable("employeeDevices", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),               // links to users.id
  deviceId: varchar("deviceId", { length: 255 }).notNull().unique(),
  deviceName: varchar("deviceName", { length: 200 }),    // e.g. "Byron's iPhone 16 Pro"
  platform: varchar("platform", { length: 50 }).default("web").notNull(), // "ios" | "android" | "web" | "other"
  pushSubscription: text("pushSubscription"),            // JSON serialized WebPush subscription or device push token
  enabled: boolean("enabled").default(true).notNull(),
  lastSeenAt: timestamp("lastSeenAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  employeeIdIdx: index("employeeDevices_employeeId_idx").on(t.employeeId),
}));
export type EmployeeDevice = typeof employeeDevices.$inferSelect;
export type InsertEmployeeDevice = typeof employeeDevices.$inferInsert;

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
}, (t) => ({
  ownerIdIdx: index("billGuardianTransactions_ownerId_idx").on(t.ownerId),
  matchedBillIdIdx: index("billGuardianTransactions_matchedBillId_idx").on(t.matchedBillId),
}));
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
  // Scheduling type: 'builtin' (CRM /book page) or 'external' (URL)
  schedulingType: varchar("schedulingType", { length: 20 }).default("builtin"),
  // Session type for inline booking (references sessionTypes.id)
  sessionTypeId: int("sessionTypeId"),
  // Custom fields config — JSON array of enabled field keys (null = all fields enabled)
  fields: text("fields"),
  // Custom labels — JSON object mapping fieldKey → custom label text
  customLabels: text("customLabels"),
  // Confirmation page customization
  confirmationHeadline: varchar("confirmationHeadline", { length: 200 }),
  confirmationBody: text("confirmationBody"),
  saveOurNumberMessage: text("saveOurNumberMessage"),
  confirmationImageKey: text("confirmationImageKey"),
  confirmationImageUrl: text("confirmationImageUrl"),
  confirmationHeadlineAlign: varchar("confirmationHeadlineAlign", { length: 10 }).default("left"),
  // Discovery worksheet (optional, for discovery call forms)
  worksheetId: int("worksheetId"),
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  submissionCount: int("submissionCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LeadForm = typeof leadForms.$inferSelect;
export type InsertLeadForm = typeof leadForms.$inferInsert;

export const brainDumpImages = mysqlTable('brain_dump_images', {
  id: int('id').primaryKey().autoincrement(),
  brainDumpItemId: int('brain_dump_item_id').notNull().references(() => brainDumpItems.id, { onDelete: 'cascade' }),
  imageUrl: text('image_url').notNull(),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
});

export type BrainDumpImage = typeof brainDumpImages.$inferSelect;
export type InsertBrainDumpImage = typeof brainDumpImages.$inferInsert;

/**
 * Client portal credentials — separate from Manus OAuth.
 * Each parent contact can have an email + hashed password for portal login.
 */
export const clientCredentials = mysqlTable('client_credentials', {
  id: int('id').primaryKey().autoincrement(),
  contactId: int('contact_id').notNull().unique(),
  email: varchar('email', { length: 320 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});
export type ClientCredential = typeof clientCredentials.$inferSelect;

/**
 * Portal sessions — issued on successful portal login.
 */
export const portalSessions = mysqlTable('portal_sessions', {
  id: int('id').primaryKey().autoincrement(),
  token: varchar('token', { length: 128 }).notNull().unique(),
  contactId: int('contact_id').notNull(),
  expiresAt: datetime('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
export type PortalSession = typeof portalSessions.$inferSelect;

/**
 * Password reset tokens for client portal forgot-password flow.
 */
export const passwordResetTokens = mysqlTable('password_reset_tokens', {
  id: int('id').primaryKey().autoincrement(),
  token: varchar('token', { length: 128 }).notNull().unique(),
  contactId: int('contact_id').notNull(),
  expiresAt: datetime('expires_at').notNull(),
  usedAt: datetime('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// ─── Smart File Builder ──────────────────────────────────────────────────────

/**
 * Smart File templates — reusable document templates created by admins.
 */
export const smartFileTemplates = mysqlTable('smart_file_templates', {
  id: int('id').primaryKey().autoincrement(),
  ownerId: int('owner_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: mysqlEnum('status', ['draft', 'active', 'archived']).default('draft').notNull(),
  settings: text('settings'), // JSON string for custom theme fonts/colors, expiration rules, and redirect URLs
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});
export type SmartFileTemplate = typeof smartFileTemplates.$inferSelect;

/**
 * Smart File blocks — ordered content blocks within a template.
 * type options: heading | text | image | contract | service | signature | initial |
 *               checkbox | field | payment | conditional | addon | internal_note
 * content: JSON string holding block-specific data (text, label, options, etc.)
 * settings: JSON string holding block-specific settings (required, placeholder, condition, etc.)
 */
export const smartFileBlocks = mysqlTable('smart_file_blocks', {
  id: int('id').primaryKey().autoincrement(),
  templateId: int('template_id').notNull(),
  blockOrder: int('block_order').notNull().default(0),
  type: varchar('type', { length: 50 }).notNull(),
  content: text('content'),   // JSON
  settings: text('settings'), // JSON
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});
export type SmartFileBlock = typeof smartFileBlocks.$inferSelect;

/**
 * Smart File add-ons — optional purchasable items attached to a template.
 */
export const smartFileAddOns = mysqlTable('smart_file_add_ons', {
  id: int('id').primaryKey().autoincrement(),
  templateId: int('template_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  shortDescription: text('short_description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull().default('0.00'),
  contractText: text('contract_text'),
  isRequired: tinyint('is_required').notNull().default(0),
  sortOrder: int('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
export type SmartFileAddOn = typeof smartFileAddOns.$inferSelect;

/**
 * Smart File assignments — a template assigned to a specific client/student.
 */
export const smartFileAssignments = mysqlTable('smart_file_assignments', {
  id: int('id').primaryKey().autoincrement(),
  templateId: int('template_id').notNull(),
  ownerId: int('owner_id').notNull(),
  contactId: int('contact_id').notNull(),           // parent contact
  studentContactId: int('student_contact_id'),       // student contact (optional)
  status: mysqlEnum('status', [
    'draft', 'sent', 'viewed', 'in_progress', 'completed',
    'payment_selected', 'payment_completed', 'overdue', 'cancelled'
  ]).default('draft').notNull(),
  dueDate: datetime('due_date'),
  sentAt: datetime('sent_at'),
  viewedAt: datetime('viewed_at'),
  completedAt: datetime('completed_at'),
  signedAt: datetime('signed_at'),
  signatureName: varchar('signature_name', { length: 255 }),
  signatureIp: varchar('signature_ip', { length: 64 }),
  initialsData: text('initials_data'),      // JSON: { blockId: initialsText }
  fieldValues: text('field_values'),        // JSON: { blockId: value }
  paymentOption: mysqlEnum('payment_option', ['one_time', 'monthly']),
  paymentAmount: decimal('payment_amount', { precision: 10, scale: 2 }),
  selectedAddOnIds: text('selected_add_on_ids'), // JSON: [id, id, ...]
  pdfUrl: text('pdf_url'),
  internalNotes: text('internal_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});
export type SmartFileAssignment = typeof smartFileAssignments.$inferSelect;

/**
 * Tech Tasks — internal technology department task tracker.
 * Used for implementation, refinement, compliance, and bug fix work.
 */
export const techTasks = mysqlTable("techTasks", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["Backlog", "In Progress", "In Review", "Done", "Stuck"])
    .default("Backlog")
    .notNull(),
  priority: mysqlEnum("priority", ["High", "Medium", "Low"]).default("Medium").notNull(),
  category: mysqlEnum("category", ["Implementation", "Refinement", "Compliance", "Bug Fix", "Infrastructure"])
    .default("Implementation")
    .notNull(),
  assignee: varchar("assignee", { length: 200 }),
  dueDate: datetime("dueDate"),
  resourceUrl: text("resourceUrl"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TechTask = typeof techTasks.$inferSelect;
export type InsertTechTask = typeof techTasks.$inferInsert;

/**
 * Tech Task Subtasks — checklist items for each tech task.
 */
export const techTaskSubtasks = mysqlTable("techTaskSubtasks", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  isComplete: boolean("isComplete").default(false).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type TechTaskSubtask = typeof techTaskSubtasks.$inferSelect;
export type InsertTechTaskSubtask = typeof techTaskSubtasks.$inferInsert;

/**
 * Discovery Call Pipeline Steps — editable step labels for the progress tracker.
 * One set per owner; defaults seeded on first use.
 */
export const discoveryPipelineSteps = mysqlTable("discoveryPipelineSteps", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  label: varchar("label", { length: 100 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DiscoveryPipelineStep = typeof discoveryPipelineSteps.$inferSelect;

/**
 * Discovery Call Sessions — one record per lead call session.
 * Stores current step, status, and all section notes/data as JSON.
 */
export const discoveryCalls = mysqlTable("discoveryCalls", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  leadId: int("leadId").notNull(),
  currentStepId: int("currentStepId"),  // FK to discoveryPipelineSteps.id
  status: mysqlEnum("status", ["Preparing", "In Progress", "Completed", "Lost"]).default("Preparing").notNull(),
  // Section data stored as JSON blobs for flexibility
  openingScript: text("openingScript"),             // section 1 editable opening script
  voicemailScript: text("voicemailScript"),         // section 1 editable voicemail script
  callScriptNotes: text("callScriptNotes"),       // section 1 notes
  theirStoryNotes: text("theirStoryNotes"),        // section 2 notes
  questionNotes: text("questionNotes"),            // section 3: JSON {questionId: notes}
  questionMode: varchar("questionMode", { length: 10 }).default("IEP/504"),  // "IEP/504" | "General"
  howItWorksNotes: text("howItWorksNotes"),        // section 4 notes
  pricingNotes: text("pricingNotes"),              // section 5 notes
  closingResponse: varchar("closingResponse", { length: 50 }),  // "Yes" | "Think about it" | "Not right now"
  nextStepsCompleted: text("nextStepsCompleted"),  // JSON array of completed checklist keys
  lostStepsCompleted: text("lostStepsCompleted"),  // JSON array of completed checklist keys
  additionalNotes: text("additionalNotes"),        // section 9 — syncs to contact notes
  privateNotes: text("privateNotes"),              // section 10 — advocate-only
  callRecordingKey: text("callRecordingKey"),      // S3 key for uploaded recording
  scheduledAt: timestamp("scheduledAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DiscoveryCall = typeof discoveryCalls.$inferSelect;

/**
 * Discovery Questions — editable per-owner question bank for section 3.
 */
export const discoveryQuestions = mysqlTable("discoveryQuestions", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  label: varchar("label", { length: 200 }).notNull(),
  subLabel: varchar("subLabel", { length: 300 }),
  mode: varchar("mode", { length: 10 }).default("both"),  // "IEP/504" | "General" | "both"
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DiscoveryQuestion = typeof discoveryQuestions.$inferSelect;

/**
 * Resources — directory of external contacts/resources (lawyers, therapists, etc.)
 * that can be shared with clients via email and portal messages.
 */
export const resources = mysqlTable("resources", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  specialty: varchar("specialty", { length: 200 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  website: varchar("website", { length: 500 }),
  address: text("address"),
  notes: text("notes"),
  category: varchar("category", { length: 100 }),  // e.g. "Attorney", "Speech Therapy", "OT"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Resource = typeof resources.$inferSelect;

/**
 * Discovery Worksheet — stores the PDF file for discovery call lead forms
 * One record per owner, stores the file key and metadata
 */
export const discoveryWorksheets = mysqlTable("discoveryWorksheets", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().unique(),
  fileKey: varchar("fileKey", { length: 500 }),  // S3 key for the PDF file
  fileName: varchar("fileName", { length: 200 }),  // Original filename
  fileSize: int("fileSize"),  // File size in bytes
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DiscoveryWorksheet = typeof discoveryWorksheets.$inferSelect;


/**
 * Folders for organizing email templates.
 */
export const emailTemplateFolders = mysqlTable("emailTemplateFolders", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  color: varchar("color", { length: 30 }).default("blue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type EmailTemplateFolder = typeof emailTemplateFolders.$inferSelect;
export type InsertEmailTemplateFolder = typeof emailTemplateFolders.$inferInsert;

/**
 * Email templates for reusable outreach, reminders, and follow-ups.
 */
export const emailTemplates = mysqlTable("emailTemplates", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  folderId: int("folderId"),  // null = unfiled
  name: varchar("name", { length: 200 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  body: text("body").notNull(),
  category: varchar("category", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;

/**
 * Sponsors & Gifts — tracks donations to the foundation (sponsor) or to a specific family (gift).
 */
export const sponsors = mysqlTable("sponsors", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  type: varchar("type", { length: 20 }).notNull(), // "sponsor" or "gift"
  donorName: varchar("donorName", { length: 200 }).notNull(),
  donorEmail: varchar("donorEmail", { length: 200 }),
  donorPhone: varchar("donorPhone", { length: 50 }),
  amount: int("amount"), // in cents
  familyContactId: int("familyContactId"), // only for "gift" type — links to a contact/family
  familyName: varchar("familyName", { length: 200 }), // display name for the family
  notes: text("notes"),
  status: varchar("status", { length: 30 }).default("received"), // received, acknowledged, pending
  donatedAt: timestamp("donatedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Sponsor = typeof sponsors.$inferSelect;
export type InsertSponsor = typeof sponsors.$inferInsert;

/**
 * Service folders for organizing services into categories.
 */
export const serviceFolders = mysqlTable("serviceFolders", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").default(1).notNull(),
  ownerId: int("ownerId").default(1).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 64 }).default("").notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 64 }).default("folder"),
  color: varchar("color", { length: 30 }).default("blue"),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  isArchived: boolean("isArchived").default(false).notNull(),
  createdBy: varchar("createdBy", { length: 255 }).default("System").notNull(),
  updatedBy: varchar("updatedBy", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  orgIdx: index("sf_org_idx").on(t.organizationId),
  slugIdx: index("sf_slug_idx").on(t.slug),
  sortIdx: index("sf_sort_idx").on(t.sortOrder),
}));
export type ServiceFolder = typeof serviceFolders.$inferSelect;
export type InsertServiceFolder = typeof serviceFolders.$inferInsert;

/**
 * Services that clients can choose from (PG-035 Advocacy Services Catalog Master Library).
 */
export const services = mysqlTable("services", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").default(1).notNull(),
  ownerId: int("ownerId").default(1).notNull(),
  folderId: int("folderId"), // null = unfiled
  serviceCode: varchar("serviceCode", { length: 64 }).default("").notNull(),
  internalName: varchar("internalName", { length: 255 }).default("").notNull(),
  clientFacingTitle: varchar("clientFacingTitle", { length: 255 }).default("").notNull(),
  name: varchar("name", { length: 200 }).notNull(), // backwards-compatible alias
  shortDescription: text("shortDescription"),
  fullDescription: text("fullDescription"),
  description: text("description"), // backwards-compatible alias
  internalInstructions: text("internalInstructions"),
  sortOrder: int("sortOrder").default(0).notNull(),
  icon: varchar("icon", { length: 64 }).default("briefcase"),
  accentColor: varchar("accentColor", { length: 32 }).default("blue"),
  price: int("price"), // in cents (backwards-compatible alias)
  standardPrice: int("standardPrice").default(0).notNull(), // in cents
  currency: varchar("currency", { length: 10 }).default("usd").notNull(),
  billingType: varchar("billingType", { length: 32 }).default("one_time").notNull(), // "recurring" | "one_time" | "included" | "free" | "custom"
  billingInterval: varchar("billingInterval", { length: 32 }), // "monthly" | "yearly" | null
  customPriceAllowed: boolean("customPriceAllowed").default(true).notNull(),
  duration: int("duration"), // in minutes (backwards-compatible alias)
  sessionDurationMinutes: int("sessionDurationMinutes"),
  deliveryTimeValue: int("deliveryTimeValue"),
  deliveryTimeUnit: varchar("deliveryTimeUnit", { length: 32 }).default("business_days"), // "hours" | "business_days" | "calendar_days" | "custom"
  deliveryTimeLabel: varchar("deliveryTimeLabel", { length: 64 }).default("3 business days"),
  isActive: boolean("isActive").default(true).notNull(),
  isArchived: boolean("isArchived").default(false).notNull(),
  availableInDiscoveryCall: boolean("availableInDiscoveryCall").default(true).notNull(),
  availableInParentPortal: boolean("availableInParentPortal").default(true).notNull(),
  availableInSupportOfferPanel: boolean("availableInSupportOfferPanel").default(true).notNull(),
  availableAsStandalone: boolean("availableAsStandalone").default(true).notNull(),
  availableAsAddOn: boolean("availableAsAddOn").default(true).notNull(),
  visibleToEmployees: boolean("visibleToEmployees").default(true).notNull(),
  planEligibility: text("planEligibility"), // JSON string record of plan eligibility
  includedItems: text("includedItems"), // JSON array of deliverable items
  allowDocumentUpload: boolean("allowDocumentUpload").default(true).notNull(),
  requireDocumentUpload: boolean("requireDocumentUpload").default(false).notNull(),
  requireQuestionnaire: boolean("requireQuestionnaire").default(false).notNull(),
  requireAgreement: boolean("requireAgreement").default(false).notNull(),
  requirePayment: boolean("requirePayment").default(true).notNull(),
  smartFileTemplateId: int("smartFileTemplateId"),
  workflowTemplateId: int("workflowTemplateId"),
  taskTemplateId: int("taskTemplateId"),
  priorityEnabled: boolean("priorityEnabled").default(false).notNull(),
  priorityPrice: int("priorityPrice"), // in cents
  priorityDeliveryTimeValue: int("priorityDeliveryTimeValue"),
  priorityDeliveryTimeUnit: varchar("priorityDeliveryTimeUnit", { length: 32 }),
  priorityDeliveryTimeLabel: varchar("priorityDeliveryTimeLabel", { length: 64 }),
  priorityDescription: text("priorityDescription"),
  stripeProductId: varchar("stripeProductId", { length: 255 }),
  stripePriceId: varchar("stripePriceId", { length: 255 }),
  stripeRecurringPriceId: varchar("stripeRecurringPriceId", { length: 255 }),
  stripePriorityPriceId: varchar("stripePriorityPriceId", { length: 255 }),
  stripeSyncStatus: varchar("stripeSyncStatus", { length: 32 }).default("not_connected").notNull(), // "not_connected" | "synced" | "update_required" | "sync_failed"
  stripeSyncedAt: timestamp("stripeSyncedAt"),
  createdBy: varchar("createdBy", { length: 255 }).default("System").notNull(),
  updatedBy: varchar("updatedBy", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  orgIdx: index("s_org_idx").on(t.organizationId),
  codeIdx: index("s_code_idx").on(t.serviceCode),
  folderIdx: index("s_folder_idx").on(t.folderId),
  activeIdx: index("s_active_idx").on(t.isActive),
  archivedIdx: index("s_archived_idx").on(t.isArchived),
  sortIdx: index("s_sort_idx").on(t.sortOrder),
}));
export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;

/**
 * Audit history for changes to the Advocacy Services Catalog.
 */
export const serviceCatalogEvents = mysqlTable("service_catalog_events", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").default(1).notNull(),
  serviceId: int("serviceId"),
  folderId: int("folderId"),
  eventType: varchar("eventType", { length: 64 }).notNull(), // "service_created" | "service_edited" | "price_changed" | "service_duplicated" | "service_activated" | "service_deactivated" | "service_archived" | "service_restored" | "folder_created" | "folder_renamed" | "folder_archived" | "stripe_sync_attempted" | "stripe_sync_completed" | "stripe_sync_failed"
  actor: varchar("actor", { length: 255 }).notNull(),
  previousValues: text("previousValues"), // JSON string
  newValues: text("newValues"), // JSON string
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (t) => ({
  orgIdx: index("sce_org_idx").on(t.organizationId),
  serviceIdx: index("sce_service_idx").on(t.serviceId),
  folderIdx: index("sce_folder_idx").on(t.folderId),
}));
export type ServiceCatalogEvent = typeof serviceCatalogEvents.$inferSelect;
export type InsertServiceCatalogEvent = typeof serviceCatalogEvents.$inferInsert;


// ============================================================
// Waypoint Complaint Engine (PG-020) — Georgia IDEA State Complaint Builder
// ============================================================

export const complaintCases = mysqlTable("complaint_cases", {
  id: int("id").autoincrement().primaryKey(),
  caseId: varchar("caseId", { length: 32 }).notNull().unique(), // e.g. GA-2026-0142
  status: mysqlEnum("status", ["draft", "in_review", "ready_to_file", "filed", "investigation", "closed"]).default("draft").notNull(),
  priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"]).default("normal").notNull(),
  // Complainant
  complainantName: varchar("complainantName", { length: 255 }),
  complainantRelationship: varchar("complainantRelationship", { length: 120 }),
  complainantAddress: text("complainantAddress"),
  complainantPhone: varchar("complainantPhone", { length: 40 }),
  complainantEmail: varchar("complainantEmail", { length: 320 }),
  // Student
  studentName: varchar("studentName", { length: 255 }),
  studentDob: datetime("studentDob"),
  studentAddress: text("studentAddress"),
  studentGrade: varchar("studentGrade", { length: 32 }),
  studentGtid: varchar("studentGtid", { length: 32 }),
  studentSchool: varchar("studentSchool", { length: 255 }),
  studentDistrict: varchar("studentDistrict", { length: 255 }),
  disabilityCategories: json("disabilityCategories").$type<string[]>(),
  isHomeless: boolean("isHomeless").default(false).notNull(),
  homelessContactInfo: text("homelessContactInfo"),
  // Parent (when different from complainant)
  parentDifferent: boolean("parentDifferent").default(false).notNull(),
  parentName: varchar("parentName", { length: 255 }),
  parentAddress: text("parentAddress"),
  parentPhone: varchar("parentPhone", { length: 40 }),
  parentEmail: varchar("parentEmail", { length: 320 }),
  // Public agency
  agencyName: varchar("agencyName", { length: 255 }),
  agencyContact: varchar("agencyContact", { length: 255 }),
  agencyAddress: text("agencyAddress"),
  // Internal metadata
  advocateName: varchar("advocateName", { length: 255 }),
  intakeDate: datetime("intakeDate"),
  complaintOwner: varchar("complaintOwner", { length: 255 }),
  targetFilingDate: datetime("targetFilingDate"),
  // Confirmed issues (user-confirmed issue category keys)
  confirmedIssues: json("confirmedIssues").$type<string[]>(),
  // Mediation & signature & delivery
  mediationRequested: mysqlEnum("mediationRequested", ["undecided", "yes", "no"]).default("undecided").notNull(),
  signatureName: varchar("signatureName", { length: 255 }),
  signatureDate: datetime("signatureDate"),
  districtCopyDelivered: boolean("districtCopyDelivered").default(false).notNull(),
  districtCopyRecipient: varchar("districtCopyRecipient", { length: 255 }),
  districtCopyDate: datetime("districtCopyDate"),
  districtCopyMethod: varchar("districtCopyMethod", { length: 120 }),
  // Final confirmations before export/file
  confirmedAccuracy: boolean("confirmedAccuracy").default(false).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const storyAnswers = mysqlTable("story_answers", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  promptKey: varchar("promptKey", { length: 64 }).notNull(), // what_happened, when_noticed, school_agreed, school_did, student_affected, asked_to_correct
  answerText: text("answerText"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const extractedFacts = mysqlTable("extracted_facts", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  factType: mysqlEnum("factType", ["date", "person", "service", "meeting", "decision", "denial", "delay", "missed_action", "issue_category", "other"]).notNull(),
  factText: text("factText").notNull(),
  sourcePrompt: varchar("sourcePrompt", { length: 64 }),
  status: mysqlEnum("status", ["unconfirmed", "confirmed", "rejected"]).default("unconfirmed").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const timelineEvents = mysqlTable("timeline_events", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  dateCertainty: mysqlEnum("dateCertainty", ["exact", "approximate", "month_year", "before", "after", "unknown"]).default("exact").notNull(),
  eventDate: datetime("eventDate"),
  eventEndDate: datetime("eventEndDate"),
  details: text("details"),
  peopleInvolved: text("peopleInvolved"),
  schoolResponse: text("schoolResponse"),
  parentResponse: text("parentResponse"),
  linkedAllegationIds: json("linkedAllegationIds").$type<number[]>(),
  linkedEvidenceIds: json("linkedEvidenceIds").$type<number[]>(),
  aiDrafted: boolean("aiDrafted").default(false).notNull(),
  confirmed: boolean("confirmed").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const allegations = mysqlTable("allegations", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  seqNumber: int("seqNumber").notNull(), // stable Allegation 01, 02...
  plainTitle: varchar("plainTitle", { length: 500 }).notNull(),
  formalTitle: varchar("formalTitle", { length: 500 }),
  status: mysqlEnum("status", ["suggested", "accepted", "needs_facts", "needs_evidence", "drafted", "ready_for_review", "excluded", "rejected"]).default("suggested").notNull(),
  issueCategories: json("issueCategories").$type<string[]>(),
  confidence: mysqlEnum("confidence", ["possible", "likely", "strong"]).default("possible").notNull(),
  reasonSuggested: text("reasonSuggested"),
  requiredElements: json("requiredElements").$type<{ text: string; met: boolean }[]>(),
  missingInfo: json("missingInfo").$type<string[]>(),
  factsUsed: json("factsUsed").$type<{ type: string; refId: number | null; text: string }[]>(),
  districtNotice: text("districtNotice"),
  districtResponse: mysqlEnum("districtResponse", ["none", "action", "denial", "delay", "no_response", "incomplete", "disputed"]).default("none").notNull(),
  districtResponseDetail: text("districtResponseDetail"),
  impactSummary: text("impactSummary"),
  draftStatement: text("draftStatement"),
  draftFacts: text("draftFacts"),
  aiSuggested: boolean("aiSuggested").default(false).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const legalAuthorities = mysqlTable("legal_authorities", {
  id: int("id").autoincrement().primaryKey(),
  allegationId: int("allegationId").notNull(),
  group: mysqlEnum("group", ["federal", "georgia", "guidance", "case_law"]).notNull(),
  citation: varchar("citation", { length: 255 }).notNull(), // e.g. 34 CFR §300.323
  subject: varchar("subject", { length: 500 }),
  whyApplies: text("whyApplies"),
  status: mysqlEnum("status", ["suggested", "confirmed", "removed"]).default("suggested").notNull(),
  verifiedForFilingDate: boolean("verifiedForFilingDate").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const evidenceItems = mysqlTable("evidence_items", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  evidenceId: varchar("evidenceId", { length: 24 }).notNull().unique(), // immutable e.g. EV-0001
  title: varchar("title", { length: 500 }).notNull(),
  category: varchar("category", { length: 64 }).default("other").notNull(), // iep, evaluation, pwn, email, meeting_notice, service_log, progress_data, behavior, discipline, medical, parent_record, school_record, other
  fileKey: text("fileKey"),
  fileUrl: text("fileUrl"),
  fileName: varchar("fileName", { length: 500 }),
  mimeType: varchar("mimeType", { length: 120 }),
  fileSize: int("fileSize"),
  pageCount: int("pageCount"),
  docDate: datetime("docDate"),
  source: varchar("source", { length: 255 }),
  summary: text("summary"),
  summaryVerified: boolean("summaryVerified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const evidenceLinks = mysqlTable("evidence_links", {
  id: int("id").autoincrement().primaryKey(),
  evidenceItemId: int("evidenceItemId").notNull(),
  targetType: mysqlEnum("targetType", ["allegation", "timeline_event"]).notNull(),
  targetId: int("targetId").notNull(),
  pageSelection: varchar("pageSelection", { length: 255 }), // e.g. "3-5, 9"
  pageNotes: text("pageNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const studentImpacts = mysqlTable("student_impacts", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  allegationId: int("allegationId"),
  category: varchar("category", { length: 64 }).notNull(), // academic, functional, behavioral, communication, safety, emotional, attendance, regression, lost_access, other
  whatChanged: text("whatChanged"),
  frequency: varchar("frequency", { length: 255 }),
  duration: varchar("duration", { length: 255 }),
  supportBasis: mysqlEnum("supportBasis", ["direct_evidence", "parent_observation", "student_report", "school_report", "inference"]).default("parent_observation").notNull(),
  supportDetail: text("supportDetail"),
  narrative: text("narrative"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const requestedRemedies = mysqlTable("requested_remedies", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  allegationId: int("allegationId"), // null = global remedy
  remedyType: varchar("remedyType", { length: 64 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  detail: text("detail"),
  purpose: text("purpose"),
  quantification: text("quantification"),
  aiSuggested: boolean("aiSuggested").default(false).notNull(),
  accepted: boolean("accepted").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const draftBlocks = mysqlTable("draft_blocks", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  sectionKey: varchar("sectionKey", { length: 64 }).notNull(), // parties, agency, jurisdiction, violations, facts, impact, resolution, mediation, signature, certification, exhibit_index, cover_letter, intro
  allegationId: int("allegationId"),
  content: text("content"),
  builtFrom: json("builtFrom").$type<{ type: string; refId: number | null; label: string }[]>(),
  aiGenerated: boolean("aiGenerated").default(false).notNull(),
  userAccepted: boolean("userAccepted").default(false).notNull(),
  version: int("version").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const aiSuggestionRecords = mysqlTable("ai_suggestion_records", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  kind: varchar("kind", { length: 64 }).notNull(), // fact_extraction, allegation_suggestion, writing, remedy_suggestion, evidence_summary
  inputSummary: text("inputSummary"),
  outputSummary: text("outputSummary"),
  action: mysqlEnum("action", ["generated", "accepted", "rejected", "edited", "regenerated"]).default("generated").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ComplaintCase = typeof complaintCases.$inferSelect;
export type StoryAnswer = typeof storyAnswers.$inferSelect;
export type ExtractedFact = typeof extractedFacts.$inferSelect;
export type TimelineEvent = typeof timelineEvents.$inferSelect;
export type Allegation = typeof allegations.$inferSelect;
export type LegalAuthority = typeof legalAuthorities.$inferSelect;
export type EvidenceItem = typeof evidenceItems.$inferSelect;
export type EvidenceLink = typeof evidenceLinks.$inferSelect;
export type StudentImpact = typeof studentImpacts.$inferSelect;
export type RequestedRemedy = typeof requestedRemedies.$inferSelect;
export type DraftBlock = typeof draftBlocks.$inferSelect;
export type AiSuggestionRecord = typeof aiSuggestionRecords.$inferSelect;

export const developerRules = mysqlTable("developer_rules", {
  tabKey: varchar("tabKey", { length: 100 }).primaryKey(),
  content: text("content"),
});

export type DeveloperRule = typeof developerRules.$inferSelect;
export type InsertDeveloperRule = typeof developerRules.$inferInsert;

export const voyageLogs = mysqlTable("voyage_logs", {
  id: int("id").autoincrement().primaryKey(),
  contactId: int("contactId").notNull(),
  portalUserId: int("portalUserId"),
  cloudflareStreamId: varchar("cloudflareStreamId", { length: 255 }),
  title: varchar("title", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).default("processing").notNull(),
  duration: varchar("duration", { length: 50 }).default("0:00").notNull(),
  rawTranscript: text("rawTranscript"),
  formattedTranscript: text("formattedTranscript"),
  executiveSummary: text("executiveSummary"),
  approvedItems: text("approvedItems"),
  unapprovedItems: text("unapprovedItems"),
  crmTaskSuggestions: text("crmTaskSuggestions"),
  caseCompassSummary: text("caseCompassSummary"),
  recordingDate: timestamp("recordingDate").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VoyageLog = typeof voyageLogs.$inferSelect;
export type InsertVoyageLog = typeof voyageLogs.$inferInsert;

// ── referencehbptl Trigger-based Automations Engine Tables ──────────────────────────────
export const referencehbptlAutomations = mysqlTable("referencehbptl_automations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  triggerEvent: varchar("triggerEvent", { length: 128 }).notNull(),
  isActive: boolean("isActive").default(false).notNull(),
  triggerConfig: text("triggerConfig"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReferencehbptlAutomation = typeof referencehbptlAutomations.$inferSelect;
export type InsertReferencehbptlAutomation = typeof referencehbptlAutomations.$inferInsert;

export const referencehbptlAutomationSteps = mysqlTable("referencehbptl_automation_steps", {
  id: int("id").autoincrement().primaryKey(),
  automationId: int("automationId").notNull(),
  stepNumber: int("stepNumber").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'email' | 'task' | 'file'
  title: varchar("title", { length: 255 }).notNull(),
  delayValue: int("delayValue").default(0).notNull(),
  delayUnit: varchar("delayUnit", { length: 50 }).default("minutes").notNull(), // 'minutes' | 'hours' | 'days' | 'weeks'
  delayAnchor: varchar("delayAnchor", { length: 100 }).default("after_trigger").notNull(),
  config: text("config").notNull(), // JSON string storing priorities, template ids, template texts, and conditional logic
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReferencehbptlAutomationStep = typeof referencehbptlAutomationSteps.$inferSelect;
export type InsertReferencehbptlAutomationStep = typeof referencehbptlAutomationSteps.$inferInsert;

export const referencehbptlAutomationRuns = mysqlTable("referencehbptl_automation_runs", {
  id: int("id").autoincrement().primaryKey(),
  automationId: int("automationId").notNull(),
  contactId: int("contactId").notNull(), // target student contact
  status: varchar("status", { length: 55 }).default("completed").notNull(), // completed | skipped | active
  logText: text("logText"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReferencehbptlAutomationRun = typeof referencehbptlAutomationRuns.$inferSelect;
export type InsertReferencehbptlAutomationRun = typeof referencehbptlAutomationRuns.$inferInsert;

// ── Parking Lot Items (PG-023-PRK) ───────────────────────────────────────────
export const parkingLotItems = mysqlTable("parkingLotItems", {
  id: int("id").autoincrement().primaryKey(),
  studentContactId: int("studentContactId"),
  title: text("title").notNull(),
  notes: text("notes"),
  category: varchar("category", { length: 100 }).default("Other").notNull(),
  priority: varchar("priority", { length: 50 }).default("Normal").notNull(),
  status: varchar("status", { length: 50 }).default("Parked").notNull(), // "Parked" | "In Discussion" | "Resolved"
  spotNumber: int("spotNumber").default(1).notNull(), // 1 to 18
  carColor: varchar("carColor", { length: 50 }).default("blue").notNull(), // "blue" | "white" | "red" | "green" | "black"
  addedBy: varchar("addedBy", { length: 50 }).default("Parent").notNull(), // "Parent" | "Advocate"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ParkingLotItemRecord = typeof parkingLotItems.$inferSelect;
export type InsertParkingLotItemRecord = typeof parkingLotItems.$inferInsert;

// ── Advocacy Pipeline Tables (PG-039) ─────────────────────────────────────────
export const pipelineStages = mysqlTable("pipeline_stages", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  slug: varchar("slug", { length: 150 }).notNull(),
  order: int("order").default(0).notNull(),
  accentColor: varchar("accentColor", { length: 50 }).default("#38BDF8").notNull(), // hex code or tailwind color
  iconName: varchar("iconName", { length: 100 }).default("Compass").notNull(),
  category: varchar("category", { length: 50 }).default("active").notNull(), // "active", "waiting", "escalation", "completed", "neutral"
  isArchived: boolean("isArchived").default(false).notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PipelineStage = typeof pipelineStages.$inferSelect;
export type InsertPipelineStage = typeof pipelineStages.$inferInsert;

export const pipelineSavedViews = mysqlTable("pipeline_saved_views", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  slug: varchar("slug", { length: 150 }).notNull(),
  filtersJson: text("filtersJson").notNull(), // JSON string storing multi-rule filters
  isPinned: boolean("isPinned").default(true).notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  order: int("order").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PipelineSavedView = typeof pipelineSavedViews.$inferSelect;
export type InsertPipelineSavedView = typeof pipelineSavedViews.$inferInsert;

// ── Student Workspace Activity Timeline (PG-030) ──────────────────────────────
export const caseActivityTimeline = mysqlTable("case_activity_timeline", {
  id: int("id").autoincrement().primaryKey(),
  studentContactId: int("studentContactId").notNull(),
  caseId: varchar("caseId", { length: 50 }),
  eventType: varchar("eventType", { length: 50 }).notNull(), // "evaluation_request", "strategy_decision", "client_contact", "school_response", "next_step", "consultation", "meeting", "note", "general"
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  whyReason: text("whyReason"), // "Why did it happen?" rationale
  ownerName: varchar("ownerName", { length: 200 }).notNull(),
  ownerRole: varchar("ownerRole", { length: 100 }).default("Staff"),
  sources: text("sources"), // JSON array of { type, label, url?, excerpt?, id? }
  quoteText: text("quoteText"), // Verbatim callout excerpt
  nextStepAction: varchar("nextStepAction", { length: 255 }),
  isActionNeeded: boolean("isActionNeeded").default(false),
  isCompleted: boolean("isCompleted").default(false),
  categoryColor: varchar("categoryColor", { length: 50 }).default("blue"), // "blue", "teal", "amber", "purple", "cyan", "yellow"
  eventDate: timestamp("eventDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  studentContactIdIdx: index("case_activity_studentContactId_idx").on(t.studentContactId),
  eventTypeIdx: index("case_activity_eventType_idx").on(t.eventType),
  eventDateIdx: index("case_activity_eventDate_idx").on(t.eventDate),
}));

export type CaseActivityTimelineItem = typeof caseActivityTimeline.$inferSelect;
export type InsertCaseActivityTimelineItem = typeof caseActivityTimeline.$inferInsert;

// ── First Mate Session Runs & AI Learning Repository (PG-037) ─────────────────
export const firstMateSessions = mysqlTable("first_mate_sessions", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 128 }).notNull().unique(),
  sessionType: varchar("sessionType", { length: 64 }).default("IEP_MEETING").notNull(),
  mode: varchar("mode", { length: 32 }).default("LIVE").notNull(), // "LIVE" | "SIMULATOR"
  status: varchar("status", { length: 32 }).default("COMPLETED").notNull(), // "ACTIVE" | "PAUSED" | "ENDED" | "COMPLETED"
  title: varchar("title", { length: 255 }).notNull(),
  studentName: varchar("studentName", { length: 255 }),
  studentContactId: int("studentContactId"),
  language: varchar("language", { length: 16 }).default("en"),
  durationSeconds: int("durationSeconds").default(0).notNull(),
  turnCount: int("turnCount").default(0).notNull(),
  keyIssue: varchar("keyIssue", { length: 255 }),
  keyIssuePriority: varchar("keyIssuePriority", { length: 64 }),
  quickAnswer: text("quickAnswer"),
  sayThis: text("sayThis"),
  whyItMatters: text("whyItMatters"),
  summary: text("summary"),
  liveAssistJson: text("liveAssistJson"), // JSON string of liveAssist data
  transcriptJson: text("transcriptJson").notNull(), // JSON string of NormalizedTranscriptEvent[]
  detectionsJson: text("detectionsJson"), // JSON string of requests, refusals, commitments
  askHistoryJson: text("askHistoryJson"), // JSON string of in-session Q&A
  notesJson: text("notesJson"), // JSON string of advocate notes
  aiModel: varchar("aiModel", { length: 128 }),
  aiLatencyMs: int("aiLatencyMs"),
  advocateRating: int("advocateRating"), // 1 - 5 star rating
  advocateFeedback: text("advocateFeedback"), // Quality critique and prompt improvement notes
  tags: text("tags"), // comma-separated or json string of tags
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  sessionIdIdx: index("fm_sessions_sessionId_idx").on(t.sessionId),
  studentContactIdIdx: index("fm_sessions_studentContactId_idx").on(t.studentContactId),
  modeIdx: index("fm_sessions_mode_idx").on(t.mode),
  createdAtIdx: index("fm_sessions_createdAt_idx").on(t.createdAt),
}));

export type FirstMateSessionRecord = typeof firstMateSessions.$inferSelect;
export type InsertFirstMateSessionRecord = typeof firstMateSessions.$inferInsert;

// ── Guide Client Live Co-Browsing Sessions (PG-030-GCL) ──────────────────────
export const guidanceSessions = mysqlTable("guidance_sessions", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull().unique(),
  studentContactId: int("studentContactId").notNull(),
  parentContactId: int("parentContactId"),
  employeeId: varchar("employeeId", { length: 128 }).notNull(),
  employeeName: varchar("employeeName", { length: 255 }).notNull(),
  status: varchar("status", { length: 32 }).default("pending").notNull(), // "pending" | "approved" | "active" | "declined" | "completed" | "disconnected" | "expired"
  currentSection: varchar("currentSection", { length: 128 }).default("Overview"),
  currentPath: varchar("currentPath", { length: 255 }).default("/portal"),
  currentTab: varchar("currentTab", { length: 64 }).default("dashboard"),
  isPaymentArea: boolean("isPaymentArea").default(false).notNull(),
  pointerX: decimal("pointerX", { precision: 6, scale: 3 }), // percentage 0 - 100
  pointerY: decimal("pointerY", { precision: 6, scale: 3 }), // percentage 0 - 100
  highlightSelector: text("highlightSelector"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  connectedAt: timestamp("connectedAt"),
  endedAt: timestamp("endedAt"),
  durationSeconds: int("durationSeconds").default(0).notNull(),
  endReason: varchar("endReason", { length: 64 }), // "completed" | "declined" | "disconnected" | "expired" | "staff_ended" | "client_ended"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  sessionIdIdx: index("guidance_sessionId_idx").on(t.sessionId),
  studentContactIdIdx: index("guidance_studentContactId_idx").on(t.studentContactId),
  statusIdx: index("guidance_status_idx").on(t.status),
}));

export type GuidanceSession = typeof guidanceSessions.$inferSelect;
export type InsertGuidanceSession = typeof guidanceSessions.$inferInsert;

export const clientPresence = mysqlTable("client_presence", {
  id: int("id").autoincrement().primaryKey(),
  studentContactId: int("studentContactId").notNull(),
  parentContactId: int("parentContactId"),
  currentPath: varchar("currentPath", { length: 255 }).default("/portal"),
  currentSection: varchar("currentSection", { length: 128 }).default("Overview"),
  isPaymentArea: boolean("isPaymentArea").default(false).notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  isOnline: boolean("isOnline").default(true).notNull(),
}, (t) => ({
  studentContactIdIdx: index("client_presence_studentContactId_idx").on(t.studentContactId),
  lastSeenAtIdx: index("client_presence_lastSeenAt_idx").on(t.lastSeenAt),
}));

export type ClientPresence = typeof clientPresence.$inferSelect;
export type InsertClientPresence = typeof clientPresence.$inferInsert;

// ── Client Support Offers (Inline Student Workspace Support Offer Panel) ────────
export const clientSupportOffers = mysqlTable("client_support_offers", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organization_id").default(1).notNull(),
  familyId: int("family_id"),
  studentId: int("student_id").notNull(),
  parentContactId: int("parent_contact_id"),
  sourceType: varchar("source_type", { length: 32 }).default("library").notNull(), // "library" | "custom"
  sourceServiceId: int("source_service_id"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  price: int("price").default(0).notNull(), // in cents (USD)
  currency: varchar("currency", { length: 10 }).default("usd").notNull(),
  deliveryTime: varchar("delivery_time", { length: 64 }).default("3 business days").notNull(),
  includedItems: text("included_items"), // JSON array of string checklist items
  planEligibility: varchar("plan_eligibility", { length: 64 }).default("one-time add-on").notNull(),
  personalNote: text("personal_note"),
  allowDocumentUpload: boolean("allow_document_upload").default(false).notNull(),
  requirePayment: boolean("require_payment").default(true).notNull(),
  priorityEnabled: boolean("priority_enabled").default(false).notNull(),
  priorityPrice: int("priority_price"), // in cents (USD)
  priorityDeliveryTime: varchar("priority_delivery_time", { length: 64 }),
  priorityDescription: text("priority_description"),
  expiresAt: timestamp("expires_at"),
  status: varchar("status", { length: 32 }).default("draft").notNull(), // "draft" | "sent" | "viewed" | "accepted" | "payment_pending" | "paid" | "payment_failed" | "in_progress" | "completed" | "declined" | "expired" | "canceled"
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  sentBy: varchar("sent_by", { length: 255 }),
  sentAt: timestamp("sent_at"),
  viewedAt: timestamp("viewed_at"),
  acceptedAt: timestamp("accepted_at"),
  declinedAt: timestamp("declined_at"),
  paidAt: timestamp("paid_at"),
  completedAt: timestamp("completed_at"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  selectedPriority: boolean("selected_priority").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  studentIdx: index("cso_student_id_idx").on(t.studentId),
  parentIdx: index("cso_parent_contact_id_idx").on(t.parentContactId),
  statusIdx: index("cso_status_idx").on(t.status),
  orgIdx: index("cso_org_id_idx").on(t.organizationId),
}));

export type ClientSupportOffer = typeof clientSupportOffers.$inferSelect;
export type InsertClientSupportOffer = typeof clientSupportOffers.$inferInsert;

export const clientSupportOfferEvents = mysqlTable("client_support_offer_events", {
  id: int("id").autoincrement().primaryKey(),
  offerId: int("offer_id").notNull(),
  studentId: int("student_id").notNull(),
  familyId: int("family_id"),
  serviceId: int("service_id"),
  eventType: varchar("event_type", { length: 64 }).notNull(), // "offer_created" | "draft_saved" | "offer_edited" | "offer_sent" | "parent_notified" | "offer_viewed" | "offer_accepted" | "payment_started" | "payment_completed" | "payment_failed" | "service_started" | "service_completed" | "offer_declined" | "offer_expired" | "offer_canceled"
  actor: varchar("actor", { length: 255 }).notNull(),
  previousStatus: varchar("previous_status", { length: 32 }),
  newStatus: varchar("new_status", { length: 32 }),
  metadata: text("metadata"), // JSON string
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (t) => ({
  offerIdx: index("csoe_offer_id_idx").on(t.offerId),
  studentIdx: index("csoe_student_id_idx").on(t.studentId),
}));

export type ClientSupportOfferEvent = typeof clientSupportOfferEvents.$inferSelect;
export type InsertClientSupportOfferEvent = typeof clientSupportOfferEvents.$inferInsert;

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CREW MESSAGES SUITE (PG-038)
 * Waypoint Private Internal Employee Communication & Collaboration System
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const crewConversations = mysqlTable("crew_conversations", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenant_id", { length: 64 }).default("waypoint").notNull(),
  type: varchar("type", { length: 32 }).notNull(), // "direct" | "group" | "channel" | "case"
  name: varchar("name", { length: 255 }),
  description: text("description"),
  linkedStudentId: int("linked_student_id"), // references contacts(id) for student case threads
  createdBy: int("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  archivedAt: timestamp("archived_at"),
}, (t) => ({
  tenantIdx: index("crew_conv_tenant_idx").on(t.tenantId),
  typeIdx: index("crew_conv_type_idx").on(t.type),
  studentIdx: index("crew_conv_student_idx").on(t.linkedStudentId),
  updatedIdx: index("crew_conv_updated_idx").on(t.updatedAt),
}));

export type CrewConversation = typeof crewConversations.$inferSelect;
export type InsertCrewConversation = typeof crewConversations.$inferInsert;

export const crewConversationMembers = mysqlTable("crew_conversation_members", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversation_id").notNull(),
  tenantId: varchar("tenant_id", { length: 64 }).default("waypoint").notNull(),
  userId: int("user_id").notNull(),
  role: varchar("role", { length: 50 }).default("member").notNull(), // "owner" | "admin" | "member"
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  lastReadMessageId: int("last_read_message_id"),
  lastReadAt: timestamp("last_read_at"),
  muted: boolean("muted").default(false),
  followed: boolean("followed").default(true),
}, (t) => ({
  convUserIdx: index("crew_member_conv_user_idx").on(t.conversationId, t.userId),
  userIdx: index("crew_member_user_idx").on(t.userId),
}));

export type CrewConversationMember = typeof crewConversationMembers.$inferSelect;
export type InsertCrewConversationMember = typeof crewConversationMembers.$inferInsert;

export const crewMessages = mysqlTable("crew_messages", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenant_id", { length: 64 }).default("waypoint").notNull(),
  conversationId: int("conversation_id").notNull(),
  senderUserId: int("sender_user_id").notNull(),
  messageType: varchar("message_type", { length: 50 }).default("text").notNull(), // "text" | "attachment" | "linked_record" | "action_request" | "system"
  body: text("body").notNull(),
  replyToMessageId: int("reply_to_message_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  editedAt: timestamp("edited_at"),
  deletedAt: timestamp("deleted_at"),
}, (t) => ({
  convCreatedIdx: index("crew_msg_conv_created_idx").on(t.conversationId, t.createdAt),
  senderIdx: index("crew_msg_sender_idx").on(t.senderUserId),
}));

export type CrewMessage = typeof crewMessages.$inferSelect;
export type InsertCrewMessage = typeof crewMessages.$inferInsert;

export const crewMessageAttachments = mysqlTable("crew_message_attachments", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenant_id", { length: 64 }).default("waypoint").notNull(),
  messageId: int("message_id").notNull(),
  documentId: int("document_id"),
  r2Key: varchar("r2_key", { length: 500 }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  fileSize: int("file_size").notNull(),
  uploadedBy: int("uploaded_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  messageIdx: index("crew_attach_msg_idx").on(t.messageId),
}));

export type CrewMessageAttachment = typeof crewMessageAttachments.$inferSelect;
export type InsertCrewMessageAttachment = typeof crewMessageAttachments.$inferInsert;

export const crewMessageLinks = mysqlTable("crew_message_links", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenant_id", { length: 64 }).default("waypoint").notNull(),
  messageId: int("message_id").notNull(),
  recordType: varchar("record_type", { length: 50 }).notNull(), // "student" | "task" | "document" | "meeting" | "case" | "timeline"
  recordId: varchar("record_id", { length: 100 }).notNull(),
  metadata: text("metadata"), // JSON string: { title, subtitle, badge, status, fileUrl, etc. }
  createdBy: int("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  messageIdx: index("crew_link_msg_idx").on(t.messageId),
  recordIdx: index("crew_link_record_idx").on(t.recordType, t.recordId),
}));

export type CrewMessageLink = typeof crewMessageLinks.$inferSelect;
export type InsertCrewMessageLink = typeof crewMessageLinks.$inferInsert;

export const crewMessageReactions = mysqlTable("crew_message_reactions", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenant_id", { length: 64 }).default("waypoint").notNull(),
  messageId: int("message_id").notNull(),
  userId: int("user_id").notNull(),
  emoji: varchar("emoji", { length: 32 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  msgEmojiIdx: index("crew_reaction_msg_emoji_idx").on(t.messageId, t.userId, t.emoji),
}));

export type CrewMessageReaction = typeof crewMessageReactions.$inferSelect;
export type InsertCrewMessageReaction = typeof crewMessageReactions.$inferInsert;

export const crewActionRequests = mysqlTable("crew_action_requests", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenant_id", { length: 64 }).default("waypoint").notNull(),
  conversationId: int("conversation_id").notNull(),
  messageId: int("message_id").notNull(),
  requestType: varchar("request_type", { length: 100 }).notNull(), // "Review Document" | "Approve Task Completion" | "Approve Case Stage Change" | "Confirm Meeting Preparation Complete" | "Request General Approval"
  title: varchar("title", { length: 255 }).notNull(),
  explanation: text("explanation"),
  requestedBy: int("requested_by").notNull(),
  assignedApproverId: int("assigned_approver_id").notNull(),
  relatedRecordType: varchar("related_record_type", { length: 50 }), // "document" | "task" | "student" | "stage" | "meeting"
  relatedRecordId: varchar("related_record_id", { length: 100 }),
  status: varchar("status", { length: 50 }).default("pending").notNull(), // "pending" | "approved" | "declined" | "changes_requested" | "cancelled"
  dueAt: timestamp("due_at"),
  decidedBy: int("decided_by"),
  decidedAt: timestamp("decided_at"),
  decisionNote: text("decision_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  convIdx: index("crew_ar_conv_idx").on(t.conversationId),
  msgIdx: index("crew_ar_msg_idx").on(t.messageId),
  approverIdx: index("crew_ar_approver_status_idx").on(t.assignedApproverId, t.status),
}));

export type CrewActionRequest = typeof crewActionRequests.$inferSelect;
export type InsertCrewActionRequest = typeof crewActionRequests.$inferInsert;

/**
 * CRM Lifecycle Events — raw immutable chronological log of every status change,
 * stage progression, milestone, drop-off, non-conversion, and cancellation.
 * Backs lead journey funnel, stage duration calculation, and retention analytics.
 */
export const crmLifecycleEvents = mysqlTable("crm_lifecycle_events", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenant_id", { length: 64 }).default("waypoint").notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(), // "lead" | "contact" | "case" | "student"
  entityId: int("entity_id").notNull(),
  eventType: varchar("event_type", { length: 50 }).notNull(), // "stage_transition" | "status_change" | "plan_change" | "non_conversion" | "cancellation" | "onboarding_step" | "advocacy_start"
  fromStage: varchar("from_stage", { length: 100 }),
  toStage: varchar("to_stage", { length: 100 }).notNull(),
  stageDurationSeconds: int("stage_duration_seconds"),
  reason: varchar("reason", { length: 255 }), // e.g. non-conversion: "Price", "Attorney needed", "Outside Waypoint's scope", etc.
  note: text("note"),
  performedBy: int("performed_by"), // users.id or null if system automation
  metadata: text("metadata"), // JSON string with context (e.g. lead source, district, plan, fee)
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  entityIdx: index("crm_event_entity_idx").on(t.entityType, t.entityId),
  eventIdx: index("crm_event_type_idx").on(t.eventType),
  toStageIdx: index("crm_event_to_stage_idx").on(t.toStage),
  createdIdx: index("crm_event_created_idx").on(t.createdAt),
}));

export type CrmLifecycleEvent = typeof crmLifecycleEvents.$inferSelect;
export type InsertCrmLifecycleEvent = typeof crmLifecycleEvents.$inferInsert;

/**
 * Advocate Time Entries — tracks all team time spent serving clients across the 12 work types.
 * Supports live timer tracking, manual log entry, and automated meeting duration logging.
 */
export const advocateTimeEntries = mysqlTable("advocate_time_entries", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenant_id", { length: 64 }).default("waypoint").notNull(),
  userId: int("user_id").notNull(), // advocate / employee
  familyContactId: int("family_contact_id"), // parent contact
  studentContactId: int("student_contact_id"), // student contact
  workType: varchar("work_type", { length: 100 }).notNull(), // "Meeting preparation" | "IEP/504 meeting" | "Records review" | "Calls" | "SMS/messages" | "Email review" | "Email drafting" | "Complaint work" | "Research" | "Case strategy" | "Follow-up" | "Administrative work"
  entryDate: varchar("entry_date", { length: 20 }).notNull(), // YYYY-MM-DD
  startTime: varchar("start_time", { length: 30 }), // HH:MM or ISO
  endTime: varchar("end_time", { length: 30 }),
  durationMinutes: int("duration_minutes").notNull(),
  relatedRecordType: varchar("related_record_type", { length: 50 }), // "task" | "appointment" | "call" | "complaint" | "document"
  relatedRecordId: varchar("related_record_id", { length: 100 }),
  planTierAtTime: varchar("plan_tier_at_time", { length: 50 }).default("$55"), // "$55", "$105", "Scholarship", "Pay Per Use"
  notes: text("notes"),
  isAutoGenerated: boolean("is_auto_generated").default(false).notNull(),
  isTimerRunning: boolean("is_timer_running").default(false).notNull(),
  timerStartedAt: timestamp("timer_started_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  userIdx: index("time_entry_user_idx").on(t.userId),
  studentIdx: index("time_entry_student_idx").on(t.studentContactId),
  workTypeIdx: index("time_entry_work_type_idx").on(t.workType),
  dateIdx: index("time_entry_date_idx").on(t.entryDate),
}));

export type AdvocateTimeEntry = typeof advocateTimeEntries.$inferSelect;
export type InsertAdvocateTimeEntry = typeof advocateTimeEntries.$inferInsert;

/**
 * Advocacy Case Outcomes — multi-outcome tracking per student case.
 * Records accommodations gained, service increases, evaluations, placement, and complaints.
 */
export const advocacyCaseOutcomes = mysqlTable("advocacy_case_outcomes", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenant_id", { length: 64 }).default("waypoint").notNull(),
  studentContactId: int("student_contact_id").notNull(),
  goalDescription: varchar("goal_description", { length: 500 }),
  goalStatus: varchar("goal_status", { length: 50 }).default("in_progress").notNull(), // "achieved" | "partially_achieved" | "in_progress" | "not_achieved"
  outcomeType: varchar("outcome_type", { length: 100 }).notNull(), // "accommodations_added" | "services_increased" | "evaluations_approved" | "iep_504_created" | "iep_504_corrected" | "placement_change" | "transportation_resolution" | "discipline_resolution" | "state_complaint"
  ideaRiskLevel: varchar("idea_risk_level", { length: 50 }).default("moderate").notNull(), // "low" | "moderate" | "high" | "critical"
  escalated: boolean("escalated").default(false).notNull(),
  complaintFiled: boolean("complaint_filed").default(false).notNull(),
  complaintOutcome: varchar("complaint_outcome", { length: 100 }), // "Favorable Finding" | "Settlement / Mediation" | "Corrective Action Ordered" | "Pending Decision" | "Withdrawn"
  timeToResolutionDays: int("time_to_resolution_days"),
  details: text("details"),
  recordedBy: int("recorded_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  studentIdx: index("outcome_student_idx").on(t.studentContactId),
  typeIdx: index("outcome_type_idx").on(t.outcomeType),
  statusIdx: index("outcome_status_idx").on(t.goalStatus),
  riskIdx: index("outcome_risk_idx").on(t.ideaRiskLevel),
}));

export type AdvocacyCaseOutcome = typeof advocacyCaseOutcomes.$inferSelect;
export type InsertAdvacyCaseOutcome = typeof advocacyCaseOutcomes.$inferInsert;

/**
 * Client Satisfaction Surveys — family feedback, confidence metrics, and NPS.
 */
export const clientSatisfactionSurveys = mysqlTable("client_satisfaction_surveys", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenant_id", { length: 64 }).default("waypoint").notNull(),
  familyContactId: int("family_contact_id").notNull(),
  studentContactId: int("student_contact_id"),
  advocateUserId: int("advocate_user_id"),
  overallRating: int("overall_rating").notNull(), // 1 to 5
  advocateRating: int("advocate_rating").notNull(), // 1 to 5
  communicationRating: int("communication_rating").notNull(), // 1 to 5
  meetingPrepRating: int("meeting_prep_rating").notNull(), // 1 to 5
  portalRating: int("portal_rating").notNull(), // 1 to 5
  confidenceGained: boolean("confidence_gained").default(true).notNull(),
  goalsAchieved: boolean("goals_achieved").default(true).notNull(),
  npsScore: int("nps_score").notNull(), // 0 to 10
  surveyType: varchar("survey_type", { length: 50 }).default("post_meeting").notNull(), // "post_meeting" | "mid_term" | "annual_renewal"
  testimonialText: text("testimonial_text"),
  testimonialPermission: boolean("testimonial_permission").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  familyIdx: index("survey_family_idx").on(t.familyContactId),
  advocateIdx: index("survey_advocate_idx").on(t.advocateUserId),
  ratingIdx: index("survey_overall_rating_idx").on(t.overallRating),
}));

export type ClientSatisfactionSurvey = typeof clientSatisfactionSurveys.$inferSelect;
export type InsertClientSatisfactionSurvey = typeof clientSatisfactionSurveys.$inferInsert;

/**
 * Membership Plan History — tracks client plan lifecycle: signups, renewals,
 * upgrades, downgrades, pauses, and structured cancellations.
 */
export const membershipPlanHistory = mysqlTable("membership_plan_history", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenant_id", { length: 64 }).default("waypoint").notNull(),
  contactId: int("contact_id").notNull(),
  eventType: varchar("event_type", { length: 50 }).notNull(), // "new_signup" | "renewal" | "upgrade" | "downgrade" | "pause" | "resume" | "cancellation" | "payment_failure" | "payment_recovered"
  fromPlan: varchar("from_plan", { length: 50 }),
  toPlan: varchar("to_plan", { length: 50 }).notNull(),
  billingCadence: varchar("billing_cadence", { length: 30 }).default("monthly").notNull(), // "monthly" | "paid_in_full"
  monthlyAmount: decimal("monthly_amount", { precision: 10, scale: 2 }).default("55.00"),
  collectedAmount: decimal("collected_amount", { precision: 10, scale: 2 }).default("55.00"),
  cancellationReason: varchar("cancellation_reason", { length: 255 }), // "Price" | "Attorney needed" | "Outside Waypoint's scope" | "Not ready" | "Chose another provider" | "Unable to reach" | "No longer needs assistance" | "Other"
  cancellationNote: text("cancellation_note"),
  effectiveDate: varchar("effective_date", { length: 30 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  contactIdx: index("plan_hist_contact_idx").on(t.contactId),
  eventIdx: index("plan_hist_event_idx").on(t.eventType),
  toPlanIdx: index("plan_hist_to_plan_idx").on(t.toPlan),
}));

export type MembershipPlanHistory = typeof membershipPlanHistory.$inferSelect;
export type InsertMembershipPlanHistory = typeof membershipPlanHistory.$inferInsert;



