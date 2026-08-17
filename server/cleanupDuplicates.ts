import { getDb } from "./db";
import {
  contacts,
  users,
  projects,
  clientFiles,
  appointments,
  contracts,
  invoices,
  voyageLogs,
} from "../drizzle/schema";
import { eq, inArray } from "drizzle-orm";

export async function runDeduplication() {
  const db = await getDb();
  if (!db) throw new Error("Database connection not available");

  console.log("=== STARTING DEDUPLICATION & RE-LINKING ===");

  // 1. Mapping duplicates to canonical IDs
  const remappings: Record<number, number> = {
    // Sarah Smith (canonical: 99)
    120003: 99,
    120007: 99,
    120008: 99,
    120009: 99,
    120010: 99,
    120011: 99,
    120015: 99,
    120019: 99,
    120025: 99,

    // Alex Smith (canonical: 120004)
    120005: 120004,
    120012: 120004,
    120016: 120004,
    120020: 120004,
    120026: 120004,

    // Mary Sheep (canonical: 120006)
    120013: 120006,
    120017: 120006,
    120021: 120006,
    120027: 120006,

    // Baaarbra Sheep (canonical: 120029)
    3: 120029,
    120014: 120029,
    120018: 120029,
    120022: 120029,
    120024: 120029,
    120028: 120029,
  };

  // Remap projects, files, appointments, contracts, invoices, voyage logs
  for (const [dupIdStr, canonicalId] of Object.entries(remappings)) {
    const dupId = parseInt(dupIdStr, 10);
    try {
      await db
        .update(projects)
        .set({ clientId: canonicalId })
        .where(eq(projects.clientId, dupId));
    } catch (e) {}

    try {
      await db
        .update(clientFiles)
        .set({ clientId: canonicalId })
        .where(eq(clientFiles.clientId, dupId));
    } catch (e) {}

    try {
      await db
        .update(appointments)
        .set({ clientId: canonicalId })
        .where(eq(appointments.clientId, dupId));
    } catch (e) {}

    try {
      await db
        .update(contracts)
        .set({ clientId: canonicalId })
        .where(eq(contracts.clientId, dupId));
    } catch (e) {}

    try {
      await db
        .update(invoices)
        .set({ clientId: canonicalId })
        .where(eq(invoices.clientId, dupId));
    } catch (e) {}

    try {
      await db
        .update(voyageLogs)
        .set({ contactId: canonicalId })
        .where(eq(voyageLogs.contactId, dupId));
    } catch (e) {}
  }

  // Ensure Baaarbra Sheep (120029) has parentContactId = 120006 (Mary Sheep)
  await db
    .update(contacts)
    .set({
      firstName: "Baaarbra",
      lastName: "Sheep",
      jobTitle: "Student",
      parentContactId: 120006,
      caseId: "WP-2026-0002",
      email: "baaarbra.sheep@waypointadvocates.com",
    })
    .where(eq(contacts.id, 120029));

  // Ensure Alex Smith (120004) has parentContactId = 99 (Sarah Smith)
  await db
    .update(contacts)
    .set({
      firstName: "Alex",
      lastName: "Smith",
      jobTitle: "Student",
      parentContactId: 99,
      caseId: "WP-2026-0001",
      email: "alex.smith@waypointadvocates.com",
    })
    .where(eq(contacts.id, 120004));

  // Delete duplicate contact IDs
  const duplicateIdsToDelete = [
    3, 120002, 120003, 120005, 120007, 120008, 120009, 120010, 120011, 120012,
    120013, 120014, 120015, 120016, 120017, 120018, 120019, 120020, 120021,
    120022, 120023, 120024, 120025, 120026, 120027, 120028,
  ];

  await db.delete(contacts).where(inArray(contacts.id, duplicateIdsToDelete));
  console.log(`Deleted ${duplicateIdsToDelete.length} duplicate contacts.`);

  // Clean up duplicate users: remove old placeholder records, keep Clerk synced admin users
  const duplicateUserIdsToDelete = [1, 9060030];
  await db.delete(users).where(inArray(users.id, duplicateUserIdsToDelete));
  console.log(`Cleaned up ${duplicateUserIdsToDelete.length} obsolete placeholder user accounts.`);

  // Check remaining contacts
  const remaining = await db.select().from(contacts);
  console.log("\n=== REMAINING CLEAN CONTACTS (" + remaining.length + ") ===");
  remaining.forEach((c) => {
    console.log(
      `ID: ${c.id} | ${c.firstName} ${c.lastName} (${c.jobTitle}) | ParentId: ${c.parentContactId} | CaseId: ${c.caseId}`
    );
  });
}

// Run if directly executed
runDeduplication()
  .then(() => {
    console.log("=== DEDUPLICATION COMPLETE ===");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Deduplication error:", err);
    process.exit(1);
  });
