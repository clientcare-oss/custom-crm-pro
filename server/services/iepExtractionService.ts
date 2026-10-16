/**
 * IEP Extraction & Smart Hybrid Profile Sync Service
 * 
 * Extracts core demographic, academic placement, and eligibility data from IEP documents,
 * and performs "Smart Hybrid" synchronization:
 * 1. Automatically populates empty profile fields without requiring manual input.
 * 2. Flags conflicting fields where current profile has data that differs from the IEP,
 *    queuing them for advocate review and one-click confirmation.
 */

import { invokeLLM, CF_MODELS } from "../_core/llm";
import { updateContactById, inMemoryContacts, getContactById } from "../db/contacts";
import { getDb } from "../db/connection";
import { contacts } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export interface ExtractedIepData {
  studentName?: string;
  dateOfBirth?: string;
  calculatedAge?: number;
  gradeLevel?: string;
  schoolName?: string;
  countyDistrict?: string;
  iepEligibility?: string;
  medicalDiagnoses?: string;
  planType?: string;
  iepMeetingDate?: string;
  caseManager?: string;
  challenges?: string;
}

/**
 * Calculates current student age from a date of birth string across formats (MM/DD/YYYY, YYYY-MM-DD, etc.)
 */
export function calculateAgeFromDob(dobString?: string | null): { age: number | null; ageDisplay: string } {
  if (!dobString) return { age: null, ageDisplay: "--" };
  const clean = dobString.trim();

  // 1. If already a plain age number like "11", "11 yrs", "11 yo", "Age: 11"
  const plainAgeMatch = clean.match(/^(?:age\s*[:\-\s]*)?(\d{1,2})(?:\s*(?:years?|yrs?|yo|y\/o))?$/i);
  if (plainAgeMatch) {
    const ageNum = parseInt(plainAgeMatch[1], 10);
    return { age: ageNum, ageDisplay: `${ageNum}` };
  }

  // 2. If chronological age like "11-2" or "11:2" (11 years, 2 months)
  const chronoMatch = clean.match(/^(\d{1,2})[-–:]\s*(\d{1,2})/);
  if (chronoMatch) {
    const ageNum = parseInt(chronoMatch[1], 10);
    return { age: ageNum, ageDisplay: `${ageNum}` };
  }

  let dob: Date | null = null;

  // 3. Named month formats like "1 Sept 2015", "September 1, 2015", "Sept 1, 2015"
  const monthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11
  };
  const namedMatch1 = clean.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  const namedMatch2 = clean.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?[\s,]+(\d{4})/);

  if (namedMatch1) {
    const day = parseInt(namedMatch1[1], 10);
    const mStr = namedMatch1[2].toLowerCase().slice(0, 3);
    const year = parseInt(namedMatch1[3], 10);
    if (monthMap[mStr] !== undefined) {
      dob = new Date(year, monthMap[mStr], day);
    }
  } else if (namedMatch2) {
    const mStr = namedMatch2[1].toLowerCase().slice(0, 3);
    const day = parseInt(namedMatch2[2], 10);
    const year = parseInt(namedMatch2[3], 10);
    if (monthMap[mStr] !== undefined) {
      dob = new Date(year, monthMap[mStr], day);
    }
  }

  // 4. Standard numeric dates (MM/DD/YYYY or YYYY-MM-DD)
  if (!dob) {
    const parts = clean.split(/[\/\-.]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        dob = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else {
        // MM/DD/YYYY
        const year = parseInt(parts[2], 10);
        const fullYear = year < 100 ? (year > 50 ? 1900 + year : 2000 + year) : year;
        dob = new Date(fullYear, parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
      }
    } else {
      const parsed = new Date(clean);
      if (!isNaN(parsed.getTime())) dob = parsed;
    }
  }

  if (!dob || isNaN(dob.getTime())) return { age: null, ageDisplay: clean };

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return { age, ageDisplay: `${age}` };
}

export interface PendingIepField {
  field: keyof ExtractedIepData;
  label: string;
  currentValue: string;
  extractedValue: string;
  sourceDocument?: string;
  confidence?: "HIGH" | "MEDIUM";
}

export interface IepSyncResult {
  contactId: number;
  extractedAt: string;
  sourceDocument: string;
  autoApplied: Array<{ field: string; label: string; value: string }>;
  pendingReview: PendingIepField[];
}

export const IEP_FIELD_LABELS: Record<string, string> = {
  gradeLevel: "Grade Level",
  schoolName: "School Name",
  countyDistrict: "School District / County",
  dateOfBirth: "Date of Birth",
  iepEligibility: "Primary Eligibility",
  medicalDiagnoses: "Medical Diagnoses",
  planType: "Plan Type",
  challenges: "Primary Challenges",
};

// In-memory store for pending IEP reviews per student contact
// Enables sub-millisecond retrieval and immediate UI reactivity
export const inMemoryPendingIepUpdates = new Map<number, {
  extractedAt: string;
  sourceDocument: string;
  fields: PendingIepField[];
}>();

/**
 * Heuristic fallback parser when LLM is unavailable (e.g. CI/CD unit testing, offline dev)
 */
export function extractIepFieldsHeuristic(text: string): ExtractedIepData {
  const result: ExtractedIepData = {};
  if (!text) return result;

  // Grade: e.g. "Grade: 5th", "Grade Level: Kindergarten", "Grade: 5"
  const gradeMatch = text.match(/(?:grade|grade\s*level|placement)\s*[:\-]?\s*([0-9Kk]+(?:st|nd|rd|th)?|Kindergarten|Pre-?K|First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth)/i);
  if (gradeMatch) {
    const rawGrade = gradeMatch[1].trim();
    if (/^[0-9]+$/i.test(rawGrade)) {
      const n = parseInt(rawGrade, 10);
      const suffix = n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
      result.gradeLevel = `${n}${suffix} Grade`;
    } else if (/^[0-9]+(st|nd|rd|th)$/i.test(rawGrade)) {
      result.gradeLevel = `${rawGrade} Grade`;
    } else {
      result.gradeLevel = rawGrade;
    }
  }

  // DOB 1: Standard numeric date e.g. "DOB: 05/14/2014", "Date of Birth 09/01/2015", "Birthdate: 2015-09-01"
  // Accepts colons, hyphens, or whitespace delimiters (for tabular PDF layouts)
  const dobMatch = text.match(/(?:dob|date\s*of\s*birth|birth\s*date|birthdate)\s*[:\-\s]\s*([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4}|[0-9]{4}[\/\-.][0-9]{1,2}[\/\-.][0-9]{1,2})/i);
  if (dobMatch) {
    result.dateOfBirth = dobMatch[1].trim();
    const { age } = calculateAgeFromDob(result.dateOfBirth);
    if (age !== null) {
      result.calculatedAge = age;
    }
  }

  // DOB 2: Named month format e.g. "Date of Birth: September 1, 2015", "DOB: 1 Sept 2015", "1Sept2015"
  if (!result.dateOfBirth) {
    const namedDobMatch = text.match(/(?:dob|date\s*of\s*birth|birth\s*date|birthdate)\s*[:\-\s]\s*([0-9]{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|October|Nov|Dec)[a-z]*\s+[0-9]{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|October|Nov|Dec)[a-z]*\s+[0-9]{1,2}(?:st|nd|rd|th)?[\s,]+[0-9]{4})/i);
    if (namedDobMatch) {
      result.dateOfBirth = namedDobMatch[1].trim();
      const { age } = calculateAgeFromDob(result.dateOfBirth);
      if (age !== null) {
        result.calculatedAge = age;
      }
    }
  }

  // DOB 3: Chronological Age in IEP / reevaluation documents (e.g. "Chronological Age: 11", "Age: 11", "Age: 11-2", "Student Age: 11 yrs")
  const ageMatch = text.match(/(?:chronological\s*age|student\s*age|\bage\b)\s*[:\-\s]\s*([0-9]{1,2}(?:[-–][0-9]{1,2})?(?:\s*(?:years?|yrs?|yo|y\/o))?)(?=\s|\n|\r|,|\.|$)/i);
  if (ageMatch) {
    const rawAge = ageMatch[1].trim();
    const { age } = calculateAgeFromDob(rawAge);
    if (age !== null && age >= 2 && age <= 26) {
      result.calculatedAge = age;
      if (!result.dateOfBirth) {
        // Derive estimated DOB based on September 1 school cutoff year
        const estYear = new Date().getFullYear() - age;
        result.dateOfBirth = `09/01/${estYear}`;
      }
    }
  }

  // School Name: e.g. "School: Centennial High School", "Attending School: Manning Oaks Elementary"
  const schoolMatch = text.match(/(?:school|attending\s*school|current\s*school|assigned\s*school)\s*[:\-]?\s*([A-Z0-9\s.,'&-]+?(?:Elementary|Middle|High|Academy|Charter|School|Primary))/i);
  if (schoolMatch) {
    result.schoolName = schoolMatch[1].trim().replace(/\s{2,}/g, " ");
  }

  // District / County: e.g. "District: Fulton County Schools", "LEA: Atlanta Public Schools"
  const districtMatch = text.match(/(?:district|lea|county|public\s*agency|system)\s*[:\-]?\s*([A-Z0-9\s.,'&-]+?(?:County\s*Schools?|Public\s*Schools?|School\s*District|City\s*Schools?|County|LEA))/i);
  if (districtMatch) {
    result.countyDistrict = districtMatch[1].trim().replace(/\s{2,}/g, " ");
  }

  // Eligibility: e.g. "Eligibility: Autism", "Primary Disability: Other Health Impairment"
  const eligibilityMatch = text.match(/(?:primary\s*disability|eligibility\s*category|eligibility|disability)\s*[:\-]?\s*([A-Za-z\s/()\-]+?)(?=\n|\r|secondary|related|date|$)/i);
  if (eligibilityMatch) {
    const rawElig = eligibilityMatch[1].trim();
    if (rawElig.length > 2 && rawElig.length < 80) {
      result.iepEligibility = rawElig;
    }
  } else {
    // Keyword scan for standard IDEA eligibility classifications
    const classifications = [
      { pattern: /\b(autism|autistic|asd)\b/i, label: "Autism (AUT)" },
      { pattern: /\b(other\s*health\s*impairment|ohi)\b/i, label: "Other Health Impairment (OHI)" },
      { pattern: /\b(specific\s*learning\s*disability|sld)\b/i, label: "Specific Learning Disability (SLD)" },
      { pattern: /\b(speech\s*or\s*language\s*impairment|sli|speech-language)\b/i, label: "Speech-Language Impairment (SLI)" },
      { pattern: /\b(emotional\s*and\s*behavioral\s*disorder|ebd|emotional\s*disturbance)\b/i, label: "Emotional & Behavioral Disorder (EBD)" },
      { pattern: /\b(intellectual\s*disability|mid|mohd)\b/i, label: "Intellectual Disability (ID)" },
      { pattern: /\b(developmental\s*delay)\b/i, label: "Developmental Delay (DD)" },
    ];
    for (const c of classifications) {
      if (c.pattern.test(text)) {
        result.iepEligibility = c.label;
        break;
      }
    }
  }

  // Medical Diagnoses: scan for common conditions
  const medicalMatches: string[] = [];
  if (/\bADHD\b|attention\s*deficit/i.test(text)) medicalMatches.push("ADHD");
  if (/\banxiety\b|generalized\s*anxiety/i.test(text)) medicalMatches.push("Generalized Anxiety");
  if (/\bsensory\s*processing/i.test(text)) medicalMatches.push("Sensory Processing Disorder");
  if (/\bepilepsy\b|\bseizure/i.test(text)) medicalMatches.push("Seizure Disorder");
  if (/\basthma\b/i.test(text)) medicalMatches.push("Asthma");
  if (/\btourette/i.test(text)) medicalMatches.push("Tourette Syndrome");
  if (medicalMatches.length > 0) {
    result.medicalDiagnoses = medicalMatches.join(", ");
  }

  // Plan Type
  if (/\b504\s*Plan\b|\bSection\s*504\b/i.test(text)) {
    result.planType = "504 Plan";
  } else if (/\bIEP\b|individualized\s*education/i.test(text)) {
    result.planType = "IEP";
  }

  // Meeting Date: e.g. "Meeting Date: 10/14/2026"
  const meetingMatch = text.match(/(?:meeting\s*date|iep\s*meeting|annual\s*review\s*date)\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i);
  if (meetingMatch) {
    result.iepMeetingDate = meetingMatch[1].trim();
  }

  return result;
}

/**
 * Intelligent semantic extractor using Cloudflare Workers AI with fallback to heuristic parser
 */
export async function extractIepData(text: string, studentName?: string): Promise<ExtractedIepData> {
  if (!text || text.trim().length === 0) return {};

  const cleanSample = text.slice(0, 12000);

  try {
    const prompt = `You are the Waypoint Advocates IEP Extraction Engine.
Extract core student demographic, eligibility, and academic placement fields from this IEP / special education document text.

STUDENT NAME CONTEXT: ${studentName || "Unknown"}

DOCUMENT TEXT:
"""
${cleanSample}
"""

CRITICAL INSTRUCTIONS:
1. Extract exact values present in the text. Return null for fields not clearly present.
2. Return ONLY a valid JSON object matching this exact structure:
{
  "studentName": string | null,
  "dateOfBirth": string | null,
  "gradeLevel": string | null,
  "schoolName": string | null,
  "countyDistrict": string | null,
  "iepEligibility": string | null,
  "medicalDiagnoses": string | null,
  "planType": "IEP" | "504 Plan" | null,
  "iepMeetingDate": string | null,
  "caseManager": string | null,
  "challenges": string | null
}`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You extract structured IEP data into valid JSON. Do not include markdown codeblocks or other commentary." },
        { role: "user", content: prompt },
      ],
      model: CF_MODELS.FAST,
    });

    const content = typeof response.choices?.[0]?.message?.content === "string"
      ? response.choices[0].message.content
      : "";

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as ExtractedIepData;
      // Merge with heuristics to fill any blanks
      const fallback = extractIepFieldsHeuristic(text);
      const finalDob = parsed.dateOfBirth || fallback.dateOfBirth;
      const { age: calcAge } = calculateAgeFromDob(finalDob);
      return {
        studentName: parsed.studentName || fallback.studentName,
        dateOfBirth: finalDob,
        calculatedAge: calcAge ?? fallback.calculatedAge,
        gradeLevel: parsed.gradeLevel || fallback.gradeLevel,
        schoolName: parsed.schoolName || fallback.schoolName,
        countyDistrict: parsed.countyDistrict || fallback.countyDistrict,
        iepEligibility: parsed.iepEligibility || fallback.iepEligibility,
        medicalDiagnoses: parsed.medicalDiagnoses || fallback.medicalDiagnoses,
        planType: parsed.planType || fallback.planType,
        iepMeetingDate: parsed.iepMeetingDate || fallback.iepMeetingDate,
        caseManager: parsed.caseManager,
        challenges: parsed.challenges || fallback.challenges,
      };
    }
  } catch (err) {
    console.warn("[IEP Extraction] LLM invoke failed, falling back to heuristic parsing:", err);
  }

  return extractIepFieldsHeuristic(text);
}

/**
 * Executes Smart Hybrid synchronization for a student contact:
 * - Empty fields are automatically updated in the database.
 * - Conflicting fields are held in pending review for advocate confirmation.
 */
export async function syncIepToStudentProfile(params: {
  contactId: number;
  extractedText: string;
  sourceDocument?: string;
}): Promise<IepSyncResult> {
  const { contactId, extractedText, sourceDocument = "Uploaded IEP" } = params;

  // 1. Fetch current student record
  let studentRecord: any = null;
  const dbConn = await getDb();
  if (dbConn) {
    try {
      const rows = await dbConn.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
      studentRecord = rows[0] || null;
    } catch (err) {
      console.warn("[IEP Sync] Error fetching student record:", err);
    }
  }
  if (!studentRecord) {
    studentRecord = inMemoryContacts.get(contactId) || null;
  }

  // 2. Extract structured data from document
  const studentName = studentRecord ? `${studentRecord.firstName} ${studentRecord.lastName}` : undefined;
  const extracted = await extractIepData(extractedText, studentName);

  const autoApplied: Array<{ field: string; label: string; value: string }> = [];
  const pendingReview: PendingIepField[] = [];
  const updatesToApply: Record<string, string> = {};

  const fieldsToCheck: Array<{ key: keyof ExtractedIepData; contactKey: string; label: string }> = [
    { key: "gradeLevel", contactKey: "gradeLevel", label: "Grade Level" },
    { key: "schoolName", contactKey: "schoolName", label: "School Name" },
    { key: "countyDistrict", contactKey: "countyDistrict", label: "School District / County" },
    { key: "dateOfBirth", contactKey: "dateOfBirth", label: "Date of Birth" },
    { key: "iepEligibility", contactKey: "iepEligibility", label: "Primary Eligibility" },
    { key: "medicalDiagnoses", contactKey: "medicalDiagnoses", label: "Medical Diagnoses" },
    { key: "planType", contactKey: "planType", label: "Plan Type" },
    { key: "challenges", contactKey: "challenges", label: "Primary Challenges" },
  ];

  for (const { key, contactKey, label } of fieldsToCheck) {
    const rawVal = extracted[key];
    const extVal = typeof rawVal === "string" ? rawVal.trim() : rawVal != null ? String(rawVal).trim() : "";
    if (!extVal) continue; // Document had no info for this field

    let fieldLabel = label;
    if (key === "dateOfBirth" && extVal) {
      const { age } = calculateAgeFromDob(extVal);
      if (age !== null) {
        fieldLabel = `Date of Birth (Calculated Age: ${age} yrs)`;
      }
    }

    const currVal = (studentRecord?.[contactKey] || "").trim();

    if (!currVal) {
      // EMPTY -> AUTO-APPLY IMMEDIATELY!
      updatesToApply[contactKey] = extVal;
      autoApplied.push({ field: contactKey, label: fieldLabel, value: extVal });
    } else if (currVal.toLowerCase() !== extVal.toLowerCase()) {
      // CONFLICTING -> QUEUE FOR ADVOCATE REVIEW!
      pendingReview.push({
        field: key,
        label: fieldLabel,
        currentValue: currVal,
        extractedValue: extVal,
        sourceDocument,
        confidence: "HIGH",
      });
    }
  }

  // 3. Apply auto-applied empty fields to database
  if (Object.keys(updatesToApply).length > 0) {
    try {
      await updateContactById(contactId, updatesToApply);
    } catch (err) {
      console.error("[IEP Sync] Failed to auto-apply empty fields:", err);
    }
  }

  // 4. Update in-memory pending queue for the student
  const nowIso = new Date().toISOString();
  if (pendingReview.length > 0) {
    inMemoryPendingIepUpdates.set(contactId, {
      extractedAt: nowIso,
      sourceDocument,
      fields: pendingReview,
    });
  } else {
    // If no conflicts, clear any existing pending queue
    inMemoryPendingIepUpdates.delete(contactId);
  }

  return {
    contactId,
    extractedAt: nowIso,
    sourceDocument,
    autoApplied,
    pendingReview,
  };
}

/**
 * Apply selected pending updates confirmed by the advocate
 */
export async function applyConfirmedIepUpdates(params: {
  contactId: number;
  acceptedFields: Record<string, string>;
  dismissRemaining?: boolean;
}): Promise<{ success: boolean; updatedCount: number }> {
  const { contactId, acceptedFields, dismissRemaining = true } = params;

  const count = Object.keys(acceptedFields).length;
  if (count > 0) {
    await updateContactById(contactId, acceptedFields);
    if (inMemoryContacts.has(contactId)) {
      const existing = inMemoryContacts.get(contactId);
      inMemoryContacts.set(contactId, { ...existing, ...acceptedFields });
    }
  }

  // Clear or update the pending queue
  if (dismissRemaining) {
    inMemoryPendingIepUpdates.delete(contactId);
  } else {
    const existing = inMemoryPendingIepUpdates.get(contactId);
    if (existing) {
      const remainingFields = existing.fields.filter(
        (f) => !(f.field in acceptedFields)
      );
      if (remainingFields.length > 0) {
        inMemoryPendingIepUpdates.set(contactId, {
          ...existing,
          fields: remainingFields,
        });
      } else {
        inMemoryPendingIepUpdates.delete(contactId);
      }
    }
  }

  return { success: true, updatedCount: count };
}

/**
 * Dismiss pending updates without applying
 */
export function dismissIepUpdates(contactId: number): boolean {
  return inMemoryPendingIepUpdates.delete(contactId);
}

/**
 * Retrieve pending updates for a student
 */
export function getPendingIepUpdates(contactId: number) {
  return inMemoryPendingIepUpdates.get(contactId) || null;
}
