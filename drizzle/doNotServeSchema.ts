import { index, int, mysqlTable, text, varchar } from "drizzle-orm/mysql-core";

// ── Internal Staff-Only Do Not Serve Register (PG-048) ─────────────────────────
export const doNotServeEntries = mysqlTable(
  "do_not_serve_entries",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("owner_id").default(1).notNull(),
    status: varchar("status", { length: 32 }).default("active").notNull(), // "active" | "lifted"
    appliesTo: varchar("applies_to", { length: 32 }).default("individual").notNull(), // "individual" | "household"
    sourceType: varchar("source_type", { length: 32 }).default("archive").notNull(), // "archive" | "manual"
    linkedContactId: int("linked_contact_id"),
    householdAnchorId: int("household_anchor_id"),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    normalizedFullName: varchar("normalized_full_name", { length: 255 }),
    primaryPhone: varchar("primary_phone", { length: 64 }),
    normalizedPrimaryPhone: varchar("normalized_primary_phone", { length: 64 }),
    primaryEmail: varchar("primary_email", { length: 320 }),
    normalizedPrimaryEmail: varchar("normalized_primary_email", { length: 320 }),
    reasonSummary: text("reason_summary").notNull(),
    originalReasonSummary: text("original_reason_summary").notNull(),
    additionalNotes: text("additional_notes"),
    supportingLinksJson: text("supporting_links_json"),
    createdByUserId: int("created_by_user_id").notNull(),
    createdByEmployeeId: varchar("created_by_employee_id", { length: 64 }),
    createdByName: varchar("created_by_name", { length: 255 }).notNull(),
    createdAt: varchar("created_at", { length: 64 }).notNull(),
    liftedAt: varchar("lifted_at", { length: 64 }),
    liftedByUserId: int("lifted_by_user_id"),
    liftedByEmployeeId: varchar("lifted_by_employee_id", { length: 64 }),
    liftedByName: varchar("lifted_by_name", { length: 255 }),
    liftedReason: text("lifted_reason"),
    reactivatedAt: varchar("reactivated_at", { length: 64 }),
    reactivatedByUserId: int("reactivated_by_user_id"),
    reactivatedByEmployeeId: varchar("reactivated_by_employee_id", { length: 64 }),
    reactivatedByName: varchar("reactivated_by_name", { length: 255 }),
    reactivatedReason: text("reactivated_reason"),
    version: int("version").default(1).notNull(),
    updatedAt: varchar("updated_at", { length: 64 }).notNull(),
  },
  (t) => ({
    ownerStatusIdx: index("dns_entries_owner_status_idx").on(t.ownerId, t.status),
    linkedContactIdx: index("dns_entries_linked_contact_idx").on(t.linkedContactId),
    householdAnchorIdx: index("dns_entries_household_anchor_idx").on(t.householdAnchorId),
  })
);

export type DoNotServeEntryRow = typeof doNotServeEntries.$inferSelect;
export type InsertDoNotServeEntryRow = typeof doNotServeEntries.$inferInsert;

export const doNotServeIdentifiers = mysqlTable(
  "do_not_serve_identifiers",
  {
    id: int("id").autoincrement().primaryKey(),
    entryId: int("entry_id").notNull(),
    ownerId: int("owner_id").default(1).notNull(),
    identifierType: varchar("identifier_type", { length: 48 }).notNull(),
    rawValue: varchar("raw_value", { length: 320 }).notNull(),
    normalizedValue: varchar("normalized_value", { length: 320 }).notNull(),
    label: varchar("label", { length: 128 }),
    isAutoSynced: int("is_auto_synced").default(0).notNull(),
    createdAt: varchar("created_at", { length: 64 }).notNull(),
    createdByName: varchar("created_by_name", { length: 255 }).notNull(),
  },
  (t) => ({
    entryIdx: index("dns_identifiers_entry_idx").on(t.entryId),
    lookupIdx: index("dns_identifiers_lookup_idx").on(
      t.ownerId,
      t.identifierType,
      t.normalizedValue
    ),
  })
);

export const doNotServeNotes = mysqlTable(
  "do_not_serve_notes",
  {
    id: int("id").autoincrement().primaryKey(),
    entryId: int("entry_id").notNull(),
    ownerId: int("owner_id").default(1).notNull(),
    body: text("body").notNull(),
    previousBody: text("previous_body"),
    authorUserId: int("author_user_id").notNull(),
    authorEmployeeId: varchar("author_employee_id", { length: 64 }),
    authorName: varchar("author_name", { length: 255 }).notNull(),
    createdAt: varchar("created_at", { length: 64 }).notNull(),
    updatedAt: varchar("updated_at", { length: 64 }),
    updatedByName: varchar("updated_by_name", { length: 255 }),
  },
  (t) => ({
    entryIdx: index("dns_notes_entry_idx").on(t.entryId),
  })
);

export const doNotServeResolutions = mysqlTable(
  "do_not_serve_resolutions",
  {
    id: int("id").autoincrement().primaryKey(),
    entryId: int("entry_id").notNull(),
    ownerId: int("owner_id").default(1).notNull(),
    targetEntityType: varchar("target_entity_type", { length: 64 }).notNull(),
    targetEntityId: varchar("target_entity_id", { length: 128 }).notNull(),
    resolutionType: varchar("resolution_type", { length: 64 }).notNull(),
    identifierFingerprint: text("identifier_fingerprint").notNull(),
    reason: text("reason"),
    actorUserId: int("actor_user_id").notNull(),
    actorEmployeeId: varchar("actor_employee_id", { length: 64 }),
    actorName: varchar("actor_name", { length: 255 }).notNull(),
    createdAt: varchar("created_at", { length: 64 }).notNull(),
  },
  (t) => ({
    targetIdx: index("dns_resolutions_target_idx").on(
      t.ownerId,
      t.targetEntityType,
      t.targetEntityId
    ),
    entryIdx: index("dns_resolutions_entry_idx").on(t.entryId),
  })
);

export const doNotServeAuditLog = mysqlTable(
  "do_not_serve_audit_log",
  {
    id: int("id").autoincrement().primaryKey(),
    entryId: int("entry_id").notNull(),
    ownerId: int("owner_id").default(1).notNull(),
    action: varchar("action", { length: 64 }).notNull(),
    summary: text("summary").notNull(),
    reason: text("reason"),
    previousValueJson: text("previous_value_json"),
    newValueJson: text("new_value_json"),
    channel: varchar("channel", { length: 64 }),
    targetEntityType: varchar("target_entity_type", { length: 64 }),
    targetEntityId: varchar("target_entity_id", { length: 128 }),
    actorUserId: int("actor_user_id"),
    actorEmployeeId: varchar("actor_employee_id", { length: 64 }),
    actorName: varchar("actor_name", { length: 255 }).notNull(),
    createdAt: varchar("created_at", { length: 64 }).notNull(),
  },
  (t) => ({
    entryIdx: index("dns_audit_entry_idx").on(t.entryId),
  })
);

export const doNotServeAlertSeen = mysqlTable("do_not_serve_alert_seen", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("owner_id").default(1).notNull(),
  staffUserId: int("staff_user_id").notNull(),
  eventKey: varchar("event_key", { length: 255 }).notNull(),
  entryId: int("entry_id").notNull(),
  dismissedAction: varchar("dismissed_action", { length: 64 }).notNull(),
  createdAt: varchar("created_at", { length: 64 }).notNull(),
});

