import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import { inMemoryContacts } from "./db/contacts";

describe("PG-030 Student Workspace — Student Profile Inline Editing", () => {
  const mockUser = {
    id: 1,
    openId: "user_test_byron",
    name: "Byron Honea",
    email: "byron@waypointadvocates.com",
    role: "admin" as const,
    loginMethod: "manually_created",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    phone: null,
    quoWebhookSecret: null,
    gmailUser: null,
    gmailAppPassword: null,
    portalDomain: null,
    logoUrl: null,
  };

  const mockCtx = {
    user: mockUser,
    req: {} as any,
    res: {} as any,
  };

  const caller = appRouter.createCaller(mockCtx);

  it("1. updates student profile fields directly inline", async () => {
    // Seed an in-memory student
    const testStudentId = 8801;
    inMemoryContacts.set(testStudentId, {
      id: testStudentId,
      ownerId: 1,
      firstName: "Elijah",
      lastName: "Mitchell",
      dateOfBirth: "2015-09-01",
      gradeLevel: "5th Grade",
      state: "Georgia",
      countyDistrict: "Paulding County School District",
      schoolName: "Connie Dugan Elementary",
      previousSchool: "The Lovett School",
      caseId: "WP-2026-0088",
      notes: "Active IEP case",
      iepEligibility: "Specific Learning Disability (SLD)",
      medicalDiagnoses: "ADHD Combined Type",
      parentContactId: 8800,
    });

    const res = await caller.contacts.updateStudentProfile({
      id: testStudentId,
      firstName: "Eli",
      gradeLevel: "6th Grade",
      schoolName: "Moses Middle School",
      countyDistrict: "Paulding County School District",
    });

    expect(res.success).toBe(true);
    expect(res.changedCount).toBeGreaterThan(0);

    const updated = await db.getContactById(testStudentId, 1);
    expect(updated).toBeDefined();
    expect(updated?.firstName).toBe("Eli");
    expect(updated?.gradeLevel).toBe("6th Grade");
    expect(updated?.schoolName).toBe("Moses Middle School");
  });

  it("2. preserves leading zeros in GTID State ID strings", async () => {
    const testStudentId = 8802;
    inMemoryContacts.set(testStudentId, {
      id: testStudentId,
      ownerId: 1,
      firstName: "Samantha",
      lastName: "Miller",
      dateOfBirth: "2016-03-12",
      caseId: "WP-2026-0089",
      notes: "Standard file",
      parentContactId: 8800,
    });

    const res = await caller.contacts.updateStudentProfile({
      id: testStudentId,
      gtid: "0091827364",
    });

    expect(res.success).toBe(true);

    const updated = await db.getContactById(testStudentId, 1);
    expect(updated?.notes).toContain("[GTID: 0091827364]");

    // Verify regex extractor extracts exact leading zero GTID
    const match = (updated?.notes || "").match(/\[GTID:\s*([^\]]+)\]/i);
    expect(match).not.toBeNull();
    expect(match![1]).toBe("0091827364");
  });

  it("3. records previous and new values, editor name, and timestamp in case activity audit history", async () => {
    const testStudentId = 8803;
    inMemoryContacts.set(testStudentId, {
      id: testStudentId,
      ownerId: 1,
      firstName: "Marcus",
      lastName: "Sterling",
      gradeLevel: "4th Grade",
      iepEligibility: "Assessment Pending",
      caseId: "WP-2026-0090",
      notes: "",
      parentContactId: 8800,
    });

    await caller.contacts.updateStudentProfile({
      id: testStudentId,
      gradeLevel: "5th Grade",
      iepEligibility: "Autism Spectrum Disorder (ASD)",
    });

    // Check timeline events for this student
    const timeline = await caller.caseActivity.list({
      studentContactId: testStudentId,
      caseId: "WP-2026-0090",
    });

    expect(timeline).toBeDefined();
    const auditEvent = timeline.find((e) => e.eventType === "profile_update");
    expect(auditEvent).toBeDefined();
    expect(auditEvent?.ownerName).toBe("Byron Honea");
    expect(auditEvent?.description).toContain('Grade Level: "4th Grade" → "5th Grade"');
    expect(auditEvent?.description).toContain('Eligibility: "Assessment Pending" → "Autism Spectrum Disorder (ASD)"');
  });

  it("4. supports multiline medical diagnoses with explicit updates", async () => {
    const testStudentId = 8804;
    inMemoryContacts.set(testStudentId, {
      id: testStudentId,
      ownerId: 1,
      firstName: "Tyler",
      lastName: "Brooks",
      medicalDiagnoses: "Mild sensory processing disorder",
      caseId: "WP-2026-0091",
      notes: "",
    });

    const multilineDiag = "Sensory Processing Disorder (Tactile)\nGeneralized Anxiety Disorder\nPediatrician note on file";
    const res = await caller.contacts.updateStudentProfile({
      id: testStudentId,
      medicalDiagnoses: multilineDiag,
    });

    expect(res.success).toBe(true);
    const updated = await db.getContactById(testStudentId, 1);
    expect(updated?.medicalDiagnoses).toBe(multilineDiag);
  });

  it("5. strictly adheres to Rule F: Zero occurrences of prohibited terms", async () => {
    const testStudentId = 8805;
    inMemoryContacts.set(testStudentId, {
      id: testStudentId,
      ownerId: 1,
      firstName: "Lucas",
      lastName: "Adams",
      caseId: "WP-2026-0092",
      notes: "",
    });

    await caller.contacts.updateStudentProfile({
      id: testStudentId,
      iepEligibility: "Other Health Impairment (OHI / ADHD)",
    });

    const timeline = await caller.caseActivity.list({
      studentContactId: testStudentId,
      caseId: "WP-2026-0092",
    });

    const serialized = JSON.stringify(timeline).toLowerCase();
    expect(serialized).not.toContain("master coach");
    expect(serialized).not.toContain("master coaching");
    expect(serialized).not.toContain("master iep coach");
  });
});
