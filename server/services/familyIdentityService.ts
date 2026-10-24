import { eq, and, or, isNull, inArray } from "drizzle-orm";
import { contacts, leads, projects, discoveryCalls, appointments } from "../../drizzle/schema";
import { getDb } from "../db/connection";

export interface ParentInput {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  timezone?: string | null;
  bestTimeToCall?: string | null;
  howHeardAboutUs?: string | null;
  referredBy?: string | null;
  secondParentName?: string | null;
  secondParentPhone?: string | null;
  secondParentEmail?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}

export interface StudentInput {
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  diagnosis?: string | null;
  schoolName?: string | null;
  gradeLevel?: string | null;
  challenges?: string | null;
  countyDistrict?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}

export interface FamilyIdentityResult {
  parentContactId: number;
  studentContactId: number | null;
  leadId: number;
  projectId: number | null;
  caseId?: string;
  isExistingFamily: boolean;
  isExistingStudent: boolean;
  ambiguousMatch?: {
    reason: string;
    existingContactId: number;
  } | null;
}

/**
 * Normalizes email address for consistent lookup.
 */
export function normalizeEmail(email?: string | null): string {
  if (!email) return "";
  return email.trim().toLowerCase();
}

/**
 * Normalizes phone number to digits only (e.g. 10 or 11 digits).
 */
export function normalizePhone(phone?: string | null): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}

export function extractInsertId(res: any): number {
  return res?.[0]?.insertId ?? res?.insertId ?? Number(res?.lastInsertRowid ?? res?.[0]?.lastInsertRowid ?? 0);
}

/**
 * Resolves or creates a unified family identity (Parent Contact, Student Contact, Lead).
 * Enforces: ONE FAMILY -> ONE CONNECTED IDENTITY -> MULTIPLE ENTRY POINTS.
 */
export async function resolveOrCreateFamilyIdentity(params: {
  ownerId: number;
  parent: ParentInput;
  student?: StudentInput;
  source?: string;
  leadSource?: string;
  referralCode?: string;
  notes?: string;
  discoveryCallDate?: Date | null;
}): Promise<FamilyIdentityResult> {
  const db = await getDb();
  if (!db) throw new Error("Database connection unavailable for family identity resolution.");

  const { ownerId, parent, student, notes, discoveryCallDate } = params;
  const source = params.source || params.leadSource;
  const cleanEmail = normalizeEmail(parent.email);
  const cleanPhone = normalizePhone(parent.phone);
  const cleanParentLast = (parent.lastName || "").trim().toLowerCase();
  const cleanParentFirst = (parent.firstName || "").trim().toLowerCase();

  let matchedParent: any = null;
  let ambiguousMatch: { reason: string; existingContactId: number } | null = null;

  // 1. Strict Email Match (Primary canonical key)
  if (cleanEmail) {
    const existingByEmail = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.ownerId, ownerId),
          eq(contacts.email, cleanEmail),
          or(isNull(contacts.parentContactId), eq(contacts.jobTitle, "Parent"), eq(contacts.jobTitle, "Parent / Client"))
        )
      )
      .limit(1);

    if (existingByEmail.length > 0) {
      matchedParent = existingByEmail[0];
    }
  }

  // 2. Secondary Verified Match (Phone + Last Name) if not matched by email
  // RULE: Never merge families on phone or name alone!
  if (!matchedParent && cleanPhone && cleanPhone.length >= 10 && cleanParentLast) {
    const candidateParents = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.ownerId, ownerId),
          or(isNull(contacts.parentContactId), eq(contacts.jobTitle, "Parent"), eq(contacts.jobTitle, "Parent / Client"))
        )
      );

    for (const cand of candidateParents) {
      const candPhone = normalizePhone(cand.phone);
      const candLast = (cand.lastName || "").trim().toLowerCase();

      if (candPhone && candPhone.length >= 10 && candPhone === cleanPhone) {
        if (candLast === cleanParentLast) {
          // Phone AND Last Name match -> Safe family match
          matchedParent = cand;
          break;
        } else {
          // Phone matches but Last Name differs -> Potential shared office or line. DO NOT MERGE.
          ambiguousMatch = {
            reason: `Phone number matches Contact #${cand.id} (${cand.firstName} ${cand.lastName}), but last name "${parent.lastName}" differs. Created separate family record for review.`,
            existingContactId: cand.id,
          };
        }
      }
    }
  }

  let isExistingFamily = false;
  let parentContactId: number;

  if (matchedParent) {
    isExistingFamily = true;
    parentContactId = matchedParent.id;

    // Safely backfill any missing contact information without overwriting existing data
    const updates: Record<string, any> = {};
    if (!matchedParent.phone && parent.phone) updates.phone = parent.phone;
    if (!matchedParent.timezone && parent.timezone) updates.timezone = parent.timezone;
    if (!matchedParent.bestTimeToCall && parent.bestTimeToCall) updates.bestTimeToCall = parent.bestTimeToCall;
    if (!matchedParent.secondParentName && parent.secondParentName) updates.secondParentName = parent.secondParentName;
    if (!matchedParent.secondParentPhone && parent.secondParentPhone) updates.secondParentPhone = parent.secondParentPhone;
    if (!matchedParent.secondParentEmail && parent.secondParentEmail) updates.secondParentEmail = parent.secondParentEmail;
    if (!matchedParent.address && parent.address) updates.address = parent.address;
    if (!matchedParent.city && parent.city) updates.city = parent.city;
    if (!matchedParent.state && parent.state) updates.state = parent.state;
    if (!matchedParent.zipCode && parent.zipCode) updates.zipCode = parent.zipCode;

    if (Object.keys(updates).length > 0) {
      await db.update(contacts).set(updates).where(eq(contacts.id, parentContactId));
    }
  } else {
    // Create new Parent Contact as Family Anchor
    const parentNotes = ambiguousMatch
      ? `[Ambiguous Match Flag]: ${ambiguousMatch.reason}\n\n${notes || ""}`.trim()
      : notes || undefined;

    const insertResult = await db.insert(contacts).values({
      ownerId,
      firstName: parent.firstName.trim(),
      lastName: parent.lastName.trim(),
      email: cleanEmail || null,
      phone: parent.phone || null,
      jobTitle: "Parent",
      timezone: parent.timezone || "America/New_York",
      bestTimeToCall: parent.bestTimeToCall || null,
      howHeardAboutUs: parent.howHeardAboutUs || null,
      referredBy: parent.referredBy || null,
      secondParentName: parent.secondParentName || null,
      secondParentPhone: parent.secondParentPhone || null,
      secondParentEmail: parent.secondParentEmail || null,
      address: parent.address || null,
      city: parent.city || null,
      state: parent.state || null,
      zipCode: parent.zipCode || null,
      notes: parentNotes || null,
      lifecycleStage: "Discovery",
      portalLifecycleStatus: "Discovery",
      accountStatus: "Onboarding",
      billingStatus: "Not Applicable",
      contractStatus: "Not Started",
    });

    parentContactId = extractInsertId(insertResult);
  }

  // 3. Resolve or Create Student Contact under this Parent Anchor
  let studentContactId: number | null = null;
  let projectId: number | null = null;
  let resolvedCaseId: string | undefined = undefined;
  let isExistingStudent = false;

  const studentFirstName = (student?.firstName || "").trim();
  const studentLastName = (student?.lastName || parent.lastName || "").trim();

  if (studentFirstName) {
    // Check if student already exists under this parent
    const cleanStudentFirst = studentFirstName.toLowerCase();
    const existingStudents = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.ownerId, ownerId), eq(contacts.parentContactId, parentContactId)));

    const foundStudent = existingStudents.find(
      (s: any) => (s.firstName || "").trim().toLowerCase() === cleanStudentFirst
    );

    if (foundStudent) {
      isExistingStudent = true;
      studentContactId = foundStudent.id;
      resolvedCaseId = foundStudent.caseId || undefined;

      // Find existing project
      const [existingProject] = await db
        .select()
        .from(projects)
        .where(eq(projects.clientId, foundStudent.id))
        .limit(1);

      if (existingProject) {
        projectId = existingProject.id;
      }
    } else {
      // Create new Student Contact linked to Parent Anchor
      const year = new Date().getFullYear();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const caseId = `WP-${year}-${randomSuffix}`;
      resolvedCaseId = caseId;

      const studentInsert = await db.insert(contacts).values({
        ownerId,
        firstName: studentFirstName,
        lastName: studentLastName,
        jobTitle: "Student",
        parentContactId,
        caseId,
        dateOfBirth: student?.dateOfBirth || null,
        diagnosis: student?.diagnosis || null,
        schoolName: student?.schoolName || null,
        gradeLevel: student?.gradeLevel || null,
        challenges: student?.challenges || null,
        countyDistrict: student?.countyDistrict || null,
        city: parent.city || null,
        state: parent.state || null,
        zipCode: parent.zipCode || null,
        lifecycleStage: "Discovery",
        portalLifecycleStatus: "Discovery",
      });

      studentContactId = extractInsertId(studentInsert);

      // Create initial Case Project for Student
      const projectInsert = await db.insert(projects).values({
        ownerId,
        clientId: studentContactId,
        name: `${studentFirstName} ${studentLastName} — Case`,
        description: `Case established from inquiry. Diagnosis: ${student?.diagnosis || "Not specified"}. Challenges: ${student?.challenges || "None provided"}.`,
        status: "Planning",
      });

      projectId = extractInsertId(projectInsert);
    }
  }

  // 4. Resolve or Create Lead Record connected to Parent Contact
  // Check for an existing open lead for this parent
  const existingLeads = await db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.ownerId, ownerId),
        eq(leads.contactId, parentContactId),
        or(
          eq(leads.status, "New"),
          eq(leads.status, "14 Day Follow-up"),
          eq(leads.status, "30 Day Follow-up"),
          eq(leads.status, "60 Day Follow-up"),
          eq(leads.status, "90 Day Follow-up"),
          eq(leads.status, "Discovery Completed")
        )
      )
    )
    .limit(1);

  let leadId: number;

  if (existingLeads.length > 0) {
    leadId = existingLeads[0].id;

    // Append inquiry note if new information provided
    if (notes && !existingLeads[0].notes?.includes(notes)) {
      const updatedNotes = `${existingLeads[0].notes ? `${existingLeads[0].notes}\n---\n` : ""}[Additional Inquiry]: ${notes}`;
      await db
        .update(leads)
        .set({
          notes: updatedNotes,
          updatedAt: new Date(),
          ...(discoveryCallDate ? { discoveryCallDate } : {}),
        })
        .where(eq(leads.id, leadId));
    }
  } else {
    // Create new Lead linked to Parent Contact Anchor
    const parentFullName = `${parent.firstName || ""} ${parent.lastName || ""}`.trim();
    const studentFullName = studentFirstName ? `${studentFirstName} ${studentLastName}`.trim() : null;

    const leadInsert = await db.insert(leads).values({
      ownerId,
      contactId: parentContactId,
      source: source || "Website Inquiry",
      status: "New",
      parentName: parentFullName || "Prospective Parent",
      parentPhone: parent.phone || null,
      studentName: studentFullName || undefined,
      studentGrade: student?.gradeLevel || undefined,
      discoveryCallDate: discoveryCallDate || undefined,
      notes: notes || `Inquiry received for ${studentFullName || "student"}.`,
    });

    leadId = extractInsertId(leadInsert);
  }

  return {
    parentContactId,
    studentContactId,
    leadId,
    projectId,
    caseId: resolvedCaseId,
    isExistingFamily,
    isExistingStudent,
    ambiguousMatch,
  };
}
