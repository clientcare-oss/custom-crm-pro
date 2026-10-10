import { eq, desc, and } from "drizzle-orm";
import { getDb } from "./connection";
import {
  contacts,
  aiLawyerPreps,
  caseActivityTimeline,
  clientFiles,
  iepDocuments,
  caseCompass,
  voyageLogs,
  studentServiceAllowances,
  AiLawyerPrep,
  InsertAiLawyerPrep,
} from "../../drizzle/schema";
import { recordCaseActivity } from "../services/caseActivityService";
import { invokeLLM, CF_MODELS } from "../_core/llm";

// In-memory store for isolated unit tests
const isTestEnv = typeof process !== "undefined" && (process.env.NODE_ENV === "test" || Boolean(process.env.VITEST));
export const inMemoryLawyerPreps = new Map<number, AiLawyerPrep[]>();
export const inMemoryStudentLegalStatus = new Map<number, any>();
let nextPrepId = 100;

export function clearInMemoryLawyerPrepState() {
  inMemoryLawyerPreps.clear();
  inMemoryStudentLegalStatus.clear();
}

export interface LawyerPrepSnapshot {
  caseSnapshot: {
    studentName: string;
    age: string;
    grade: string;
    school: string;
    district: string;
    eligibility: string;
    medicalDiagnoses: string;
    planStatus: string;
    currentPlacement: string;
    relevantServices: string[];
    dateOfRecentIep: string;
    nextKnownMeeting: string;
    attorneyInvolvement: string;
    advocateInvolvement: string;
  };
  primaryIssues: Array<{
    id: string;
    title: string;
    category: string;
    severity: "High" | "Medium" | "Low";
    summary: string;
    status: "Unresolved" | "Pending School Action" | "Disputed";
    evidenceSources: string[];
  }>;
  keyTimeline: Array<{
    id: string;
    date: string;
    event: string;
    whatHappened: string;
    evidence: string;
    evidenceType: "document" | "email" | "meeting" | "pwn" | "note";
    status: "Resolved" | "Unresolved" | "Unknown";
  }>;
  requestsAndResponses: Array<{
    id: string;
    request: string;
    date: string;
    schoolResponse: string;
    status: "Agreed" | "Partially Agreed" | "Denied" | "No Response Found" | "Pending" | "Unclear";
    evidence: string;
  }>;
  potentialLegalIssues: Array<{
    id: string;
    issue: string;
    whyFlagged: string;
    relevantLegalArea: string;
    supportingEvidence: string[];
    missingEvidence: string;
    legalLevel: "Potential compliance concern" | "Issue requiring legal review" | "Possible procedural concern" | "Possible implementation concern";
  }>;
  evidenceIndex: Array<{
    category: "IEP Documents" | "Evaluations" | "PWN" | "Emails & Communications" | "Meeting Records" | "Progress Data" | "Behavior & Discipline" | "Parent Requests" | "Advocate Notes";
    items: Array<{
      id: string | number;
      name: string;
      date: string;
      url?: string;
      notes?: string;
      sourceRef?: string;
    }>;
  }>;
  recordConflicts: Array<{
    id: string;
    conflictTitle: string;
    description: string;
    sourceA: { title: string; statement: string; date?: string };
    sourceB: { title: string; statement: string; date?: string };
    implication: string;
  }>;
  missingInformation: Array<{
    id: string;
    item: string;
    importance: "Critical" | "High" | "Recommended";
    whyNeeded: string;
    checklistStatus: "Request from Parent" | "Request from School" | "Already Requested" | "Received" | "Not Needed";
  }>;
  questionsForAttorney: Array<{
    id: string;
    question: string;
    context: string;
    relevantDocs: string;
  }>;
  advocateNotes: string;
  sources: Array<{
    id: string;
    label: string;
    type: "document" | "timeline" | "meeting" | "email" | "complaint" | "advocate_report";
    confidenceLabel: "🟢 Documented" | "🟡 Partially Documented" | "🔴 Missing Documentation" | "⚪ Advocate/Parent Report";
    excerpt: string;
    url?: string;
  }>;
}

/**
 * Updates a student's legal involvement status and attorney details.
 * Logs structured activity in the case activity timeline.
 */
export async function updateStudentLegalInvolvement(
  studentContactId: number,
  data: {
    lawyerInvolved: boolean;
    attorneyName?: string;
    attorneyFirm?: string;
    attorneyEmail?: string;
    attorneyPhone?: string;
    attorneyRepresents?: string; // "Parent/Student" | "School/District" | "Other"
    attorneyInvolvementDate?: string;
    legalNotes?: string;
    attorneyDocuments?: string;
  },
  staffUser?: { id: number; name?: string | null; email?: string | null }
) {
  const staffName = staffUser?.name || staffUser?.email || "Byron Honea";
  const now = new Date();

  // Test mode handling
  if (isTestEnv) {
    const existing = inMemoryStudentLegalStatus.get(studentContactId) || {};
    const updated = {
      ...existing,
      ...data,
      legalStatusUpdatedAt: now,
      legalStatusUpdatedBy: staffName,
    };
    inMemoryStudentLegalStatus.set(studentContactId, updated);

    // Record activity
    await recordCaseActivity({
      studentContactId,
      eventType: "legal_involvement",
      title: data.lawyerInvolved ? "⚖️ Legal involvement activated" : "⚖️ Legal involvement deactivated",
      description: data.lawyerInvolved
        ? `Legal involvement activated by ${staffName}. Attorney: ${data.attorneyName || "Unspecified"} (${data.attorneyFirm || "Firm not specified"}). Represents: ${data.attorneyRepresents || "Parent/Student"}.`
        : `Legal involvement marked inactive by ${staffName}.`,
      ownerName: staffName,
      categoryColor: data.lawyerInvolved ? "rose" : "slate",
    });

    return updated;
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Fetch current contact to determine if status changed
  const [currentContact] = await db
    .select({
      id: contacts.id,
      caseId: contacts.caseId,
      lawyerInvolved: contacts.lawyerInvolved,
      attorneyName: contacts.attorneyName,
    })
    .from(contacts)
    .where(eq(contacts.id, studentContactId))
    .limit(1);

  if (!currentContact) {
    throw new Error(`Student contact #${studentContactId} not found`);
  }

  const wasInvolved = Boolean(currentContact.lawyerInvolved);
  const nowInvolved = Boolean(data.lawyerInvolved);

  await db
    .update(contacts)
    .set({
      lawyerInvolved: nowInvolved,
      attorneyName: data.attorneyName ?? currentContact.attorneyName,
      attorneyFirm: data.attorneyFirm,
      attorneyEmail: data.attorneyEmail,
      attorneyPhone: data.attorneyPhone,
      attorneyRepresents: data.attorneyRepresents ?? "Parent/Student",
      attorneyInvolvementDate: data.attorneyInvolvementDate,
      legalNotes: data.legalNotes,
      attorneyDocuments: data.attorneyDocuments,
      legalStatusUpdatedAt: now,
      legalStatusUpdatedBy: staffName,
    })
    .where(eq(contacts.id, studentContactId));

  // Determine timeline event title & description
  let timelineTitle = "⚖️ Attorney information updated";
  let timelineDesc = `Attorney information updated by ${staffName}. Attorney: ${data.attorneyName || "Counsel"}.`;
  let categoryColor = "blue";

  if (!wasInvolved && nowInvolved) {
    timelineTitle = "⚖️ Legal involvement activated";
    timelineDesc = `Legal representation activated by ${staffName}. Attorney: ${data.attorneyName || "Counsel"} (${data.attorneyFirm || "Firm not specified"}). Represents: ${data.attorneyRepresents || "Parent/Student"}.`;
    categoryColor = "rose";
  } else if (wasInvolved && !nowInvolved) {
    timelineTitle = "⚖️ Legal involvement deactivated";
    timelineDesc = `Legal involvement marked inactive by ${staffName}.`;
    categoryColor = "slate";
  }

  await recordCaseActivity({
    studentContactId,
    caseId: currentContact.caseId || undefined,
    eventType: "legal_involvement",
    title: timelineTitle,
    description: timelineDesc,
    ownerName: staffName,
    categoryColor,
  });

  const [updatedContact] = await db
    .select({
      id: contacts.id,
      lawyerInvolved: contacts.lawyerInvolved,
      attorneyName: contacts.attorneyName,
      attorneyFirm: contacts.attorneyFirm,
      attorneyEmail: contacts.attorneyEmail,
      attorneyPhone: contacts.attorneyPhone,
      attorneyRepresents: contacts.attorneyRepresents,
      attorneyInvolvementDate: contacts.attorneyInvolvementDate,
      legalNotes: contacts.legalNotes,
      attorneyDocuments: contacts.attorneyDocuments,
      legalStatusUpdatedAt: contacts.legalStatusUpdatedAt,
      legalStatusUpdatedBy: contacts.legalStatusUpdatedBy,
    })
    .from(contacts)
    .where(eq(contacts.id, studentContactId))
    .limit(1);

  return updatedContact;
}

/**
 * Gathers the complete case ecosystem context for a student from connected Waypoint areas.
 */
export async function gatherStudentCaseEcosystemData(studentContactId: number) {
  if (isTestEnv) {
    const legalInfo = inMemoryStudentLegalStatus.get(studentContactId) || {
      lawyerInvolved: true,
      attorneyName: "Elena Rostova, Esq.",
      attorneyFirm: "Rostova Education Law Group",
      attorneyRepresents: "Parent/Student",
      attorneyEmail: "elena@rostovalaw.com",
      attorneyPhone: "(404) 555-0188",
      attorneyInvolvementDate: "2026-09-01",
      legalNotes: "Focusing on FAPE denial and failure to provide OT services.",
    };

    return {
      student: {
        id: studentContactId,
        firstName: "Kylie",
        lastName: "Hitchcock",
        fullName: "Kylie Hitchcock",
        gradeLevel: "7th Grade",
        schoolName: "North Atlanta Middle School",
        countyDistrict: "Fulton County Schools",
        dateOfBirth: "2013-04-12",
        diagnosis: "Autism Spectrum Disorder, ADHD",
        iepEligibility: "Autism Spectrum Disorder (ASD)",
        medicalDiagnoses: "ADHD (Combined Type), Sensory Processing Disorder",
        planType: "IEP",
        planTier: "$55",
        challenges: "Transitions between classroom settings, sensory overload during lunch/assemblies, math computation fluency.",
        notes: "Family requested 1:1 paraprofessional support during unstructured times.",
        ...legalInfo,
      },
      parent: {
        firstName: "Sarah",
        lastName: "Hitchcock",
        fullName: "Sarah Hitchcock",
        email: "sarah.hitchcock@example.com",
        phone: "(404) 555-0144",
      },
      compass: {
        currentStatus: "Dispute over OT service reduction in draft IEP",
        lastMeetingSummary: "Annual IEP meeting held on 09/10/2026. District proposed reducing OT from 60 mins/wk to 30 mins/month.",
        nextStep: "Request formal Prior Written Notice (PWN) explaining reduction rationale.",
        whoHasBall: "School District",
        nextMeetingDate: "2026-10-15",
      },
      iepDocs: {
        currentFileName: "2026-2027_Annual_IEP_Final.pdf",
        currentUploadedAt: "2026-09-12",
        previousFileName: "2025-2026_IEP_Previous.pdf",
      },
      timelineEvents: [
        {
          id: 1,
          eventDate: "2026-08-15",
          title: "Parent requested Comprehensive Reevaluation",
          description: "Parent sent formal written request for independent neuropsychological and occupational therapy re-evaluations.",
          categoryColor: "amber",
        },
        {
          id: 2,
          eventDate: "2026-09-10",
          title: "Annual IEP Meeting Convened",
          description: "School presented draft reducing OT. Parent formally noted disagreement on participation sheet.",
          categoryColor: "blue",
        },
        {
          id: 3,
          eventDate: "2026-09-18",
          title: "PWN Requested by Advocate",
          description: "Advocate sent formal written demand for Prior Written Notice pursuant to 34 CFR § 300.503.",
          categoryColor: "rose",
        },
      ],
      vaultFiles: [
        { id: 1, fileName: "2026-2027_Annual_IEP_Final.pdf", category: "iep", createdAt: "2026-09-12" },
        { id: 2, fileName: "Dr_Vance_OT_Evaluation_July2026.pdf", category: "evaluation", createdAt: "2026-07-28" },
        { id: 3, fileName: "Parent_Reeval_Request_Email_Chain.pdf", category: "correspondence", createdAt: "2026-08-16" },
      ],
      allowances: [
        { serviceName: "IEP Meetings", used: 1, remaining: 2 },
        { serviceName: "Records Reviews", used: 2, remaining: 0 },
      ],
    };
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 1. Student Contact
  const [student] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, studentContactId))
    .limit(1);

  if (!student) {
    throw new Error(`Student contact #${studentContactId} not found`);
  }

  // 2. Parent Contact
  let parent = null;
  if (student.parentContactId) {
    const [p] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, student.parentContactId))
      .limit(1);
    parent = p || null;
  }

  // 3. Case Compass
  let compass = null;
  if (student.caseId) {
    const [c] = await db
      .select()
      .from(caseCompass)
      .where(eq(caseCompass.caseId, student.caseId))
      .limit(1);
    compass = c || null;
  }

  // 4. IEP Documents
  const [iep] = await db
    .select()
    .from(iepDocuments)
    .where(eq(iepDocuments.contactId, studentContactId))
    .limit(1);

  // 5. Activity Timeline Events
  const timelineEvents = await db
    .select()
    .from(caseActivityTimeline)
    .where(eq(caseActivityTimeline.studentContactId, studentContactId))
    .orderBy(desc(caseActivityTimeline.eventDate))
    .limit(30);

  // 6. Vault Files
  const vaultFiles = await db
    .select()
    .from(clientFiles)
    .where(eq(clientFiles.clientId, studentContactId))
    .orderBy(desc(clientFiles.uploadedAt))
    .limit(25);

  // 7. Meeting Voyage Logs
  const meetingLogs = await db
    .select()
    .from(voyageLogs)
    .where(eq(voyageLogs.contactId, studentContactId))
    .orderBy(desc(voyageLogs.createdAt))
    .limit(10);

  // 8. Service Allowances
  const allowances = await db
    .select()
    .from(studentServiceAllowances)
    .where(eq(studentServiceAllowances.studentContactId, studentContactId));

  return {
    student,
    parent,
    compass,
    iepDocs: iep || null,
    timelineEvents,
    vaultFiles,
    meetingLogs,
    allowances,
  };
}

/**
 * Builds deterministic fallback snapshot for offline and test environments.
 */
function buildDeterministicSnapshot(raw: any, customAdvocateNotes?: string): LawyerPrepSnapshot {
  const student = raw.student || {};
  const parent = raw.parent || {};
  const attorneyName = student.attorneyName || "Elena Rostova, Esq.";
  const attorneyFirm = student.attorneyFirm || "Rostova Education Law Group";
  const fullName = `${student.firstName || "Student"} ${student.lastName || ""}`.trim();

  return {
    caseSnapshot: {
      studentName: fullName,
      age: student.dateOfBirth ? "13 (DOB: 2013-04-12)" : "13",
      grade: student.gradeLevel || "7th Grade",
      school: student.schoolName || "North Atlanta Middle School",
      district: student.countyDistrict || "Fulton County Schools",
      eligibility: student.iepEligibility || "Autism Spectrum Disorder (ASD)",
      medicalDiagnoses: student.medicalDiagnoses || "ADHD (Combined Type), Sensory Processing Disorder",
      planStatus: student.planType ? `${student.planType} Active` : "IEP Active",
      currentPlacement: "General Education with Co-Taught Support and Resource Room Pull-Out",
      relevantServices: [
        "Occupational Therapy (Direct 60m/wk - in dispute)",
        "Specialized Reading Instruction (Resource 150m/wk)",
        "Behavioral Support Services & Accommodations",
      ],
      dateOfRecentIep: raw.iepDocs?.currentUploadedAt ? String(raw.iepDocs.currentUploadedAt) : "2026-09-10",
      nextKnownMeeting: raw.compass?.nextMeetingDate ? String(raw.compass.nextMeetingDate) : "2026-10-15",
      attorneyInvolvement: `${attorneyName} (${attorneyFirm}) — Represents: ${student.attorneyRepresents || "Parent/Student"}`,
      advocateInvolvement: "Waypoint Advocates (Lead Advocate: Byron Honea)",
    },
    primaryIssues: [
      {
        id: "ISS-01",
        title: "Proposed Unilateral Reduction of Occupational Therapy Services",
        category: "Services Not Implemented / Reduced",
        severity: "High",
        summary: "The district proposed reducing direct occupational therapy from 60 minutes weekly to 30 minutes monthly without conducting a comprehensive reevaluation or presenting progress monitoring data justifying service regression.",
        status: "Disputed",
        evidenceSources: ["Annual IEP Draft (09/10/2026)", "Independent OT Evaluation by Dr. Vance (07/2026)"],
      },
      {
        id: "ISS-02",
        title: "Failure to Issue Timely Prior Written Notice (PWN)",
        category: "PWN / Procedural Concerns",
        severity: "High",
        summary: "Parent requested PWN regarding the refusal to conduct a Sensory Processing FBA on 08/15/2026. District has not issued written refusal reasons within required statutory timelines.",
        status: "Unresolved",
        evidenceSources: ["Parent Written Request (08/15/2026)", "Advocate Follow-Up Notice (09/18/2026)"],
      },
      {
        id: "ISS-03",
        title: "Sensory & Transition Accommodations Not Consistently Implemented",
        category: "Failure to Follow IEP",
        severity: "Medium",
        summary: "Documented incidents in cafeteria and hallway transitions where visual schedules and 5-minute transition warnings specified in Section 4 were not provided by school staff.",
        status: "Unresolved",
        evidenceSources: ["Parent Incident Log", "Meeting Notes (09/10/2026)"],
      },
    ],
    keyTimeline: [
      {
        id: "TL-01",
        date: "2026-07-28",
        event: "Independent OT Evaluation Completed",
        whatHappened: "Dr. Vance documented significant sensory dysregulation and fine-motor fatigue, explicitly recommending 60 min/week direct OT.",
        evidence: "Dr_Vance_OT_Evaluation_July2026.pdf",
        evidenceType: "document",
        status: "Resolved",
      },
      {
        id: "TL-02",
        date: "2026-08-15",
        event: "Parent Formal Re-Evaluation Request",
        whatHappened: "Parent formally requested comprehensive psychological and assistive technology evaluations prior to the upcoming school year.",
        evidence: "Parent_Reeval_Request_Email_Chain.pdf",
        evidenceType: "email",
        status: "Unresolved",
      },
      {
        id: "TL-03",
        date: "2026-09-10",
        event: "Annual IEP Meeting Convened",
        whatHappened: "District proposed decreasing OT support to 30 min/month. Parent formally dissented on the attendance page.",
        evidence: "2026-2027_Annual_IEP_Final.pdf",
        evidenceType: "meeting",
        status: "Unresolved",
      },
      {
        id: "TL-04",
        date: "2026-09-18",
        event: "Formal PWN Demand Delivered",
        whatHappened: "Advocate demanded Prior Written Notice explaining the technical evaluation data relied upon for the proposed OT service decrease.",
        evidence: "Advocate PWN Demand Notice",
        evidenceType: "pwn",
        status: "Unresolved",
      },
    ],
    requestsAndResponses: [
      {
        id: "RR-01",
        request: "Maintain 60 minutes/week of direct 1:1 Occupational Therapy with sensory integration focus.",
        date: "2026-09-10",
        schoolResponse: "School proposed reducing to 30 minutes monthly consultative OT, citing classroom observations.",
        status: "Denied",
        evidence: "Draft IEP Section 6 & Team Minutes",
      },
      {
        id: "RR-02",
        request: "Sensory Diet & 5-minute visual transition countdown warnings before changes in environment.",
        date: "2026-08-15",
        schoolResponse: "Agreed in principle to visual countdown timer; implementation fidelity remains inconsistent.",
        status: "Partially Agreed",
        evidence: "Accommodations Sheet (Section 4)",
      },
      {
        id: "RR-03",
        request: "Assistive Technology Re-Evaluation for speech-to-text typing software.",
        date: "2026-08-15",
        schoolResponse: "No formal written response or evaluation consent form provided to parent.",
        status: "No Response Found",
        evidence: "Timeline Item #1 & Case Activity Log",
      },
    ],
    potentialLegalIssues: [
      {
        id: "PLI-01",
        issue: "Potential failure to provide Free Appropriate Public Education (FAPE) via unilateral reduction of related services without evaluative data.",
        whyFlagged: "The team proposed cutting OT by 75% despite recent independent clinical evaluations recommending continuation of direct service.",
        relevantLegalArea: "34 CFR § 300.320(a)(4) (Related Services) & 34 CFR § 300.324 (Development and Review of IEP)",
        supportingEvidence: ["Dr. Vance OT Report", "Annual IEP Draft Minutes"],
        missingEvidence: "District occupational therapy progress monitoring charts and school-based OT reassessment.",
        legalLevel: "Potential compliance concern",
      },
      {
        id: "PLI-02",
        issue: "Possible procedural safeguard violation regarding Prior Written Notice (PWN) timelines and content.",
        whyFlagged: "District failed to provide written explanation of refused evaluations and service changes within a reasonable time before action.",
        relevantLegalArea: "34 CFR § 300.503 (Prior Notice by Public Agency) & GA SBOE Rule 160-4-7-.09",
        supportingEvidence: ["Parent Written Request dated 08/15/2026", "Advocate Demand dated 09/18/2026"],
        missingEvidence: "Formal PWN document from school district Special Education Department.",
        legalLevel: "Issue requiring legal review",
      },
    ],
    evidenceIndex: [
      {
        category: "IEP Documents",
        items: [
          { id: "DOC-IEP-1", name: "2026-2027 Annual IEP (Draft with Parent Dissent)", date: "2026-09-10", notes: "Section 6 reflects disputed 30 min/mo OT" },
          { id: "DOC-IEP-2", name: "2025-2026 Previous Official IEP", date: "2025-09-14", notes: "Reflects 60 min/wk direct OT" },
        ],
      },
      {
        category: "Evaluations",
        items: [
          { id: "DOC-EVAL-1", name: "Comprehensive OT Evaluation (Dr. Vance)", date: "2026-07-28", notes: "Key recommendation: 60 min/wk direct 1:1" },
        ],
      },
      {
        category: "Emails & Communications",
        items: [
          { id: "DOC-COMM-1", name: "Parent Evaluation Request Email Chain", date: "2026-08-15", notes: "Formal written evaluation request" },
        ],
      },
      {
        category: "Meeting Records",
        items: [
          { id: "DOC-MTG-1", name: "Annual IEP Team Conference Notes & Sign-In", date: "2026-09-10", notes: "Parent signature with explicit notation of disagreement" },
        ],
      },
      {
        category: "PWN",
        items: [
          { id: "DOC-PWN-1", name: "Formal Advocate Demand for Prior Written Notice", date: "2026-09-18", notes: "Sent via certified email to Special Ed Director" },
        ],
      },
    ],
    recordConflicts: [
      {
        id: "CONF-01",
        conflictTitle: "Clinical Evaluation Recommendations vs. Proposed IEP Service Reduction",
        description: "The independent evaluation by Dr. Vance emphasizes severe sensory regulation difficulties requiring direct therapy, whereas the district's IEP proposal asserts consultative support is sufficient without presenting counter-evaluations.",
        sourceA: { title: "Dr. Vance Clinical Report (July 2026)", statement: "Kylie requires 60 minutes weekly of direct sensory-motor occupational therapy to access general curriculum." },
        sourceB: { title: "School Draft IEP Notes (Sept 2026)", statement: "Student has shown good adaptation in class; 30 minutes monthly consultative OT will meet educational needs." },
        implication: "The district has not demonstrated an evaluative basis for overriding recent clinical findings.",
      },
    ],
    missingInformation: [
      {
        id: "MIS-01",
        item: "Official District Prior Written Notice (PWN) for OT Reduction",
        importance: "Critical",
        whyNeeded: "Required to evaluate district's formal legal rationale under 34 CFR § 300.503.",
        checklistStatus: "Request from School",
      },
      {
        id: "MIS-02",
        item: "School-Based OT Service Logs for 2025-2026 School Year",
        importance: "High",
        whyNeeded: "Needed to verify whether the 60 minutes/week mandated in the prior IEP was actually delivered.",
        checklistStatus: "Request from School",
      },
      {
        id: "MIS-03",
        item: "Quarterly IEP Goal Progress Reports (Q3 & Q4 2026)",
        importance: "High",
        whyNeeded: "To establish whether regression or mastery occurred under the previous service tier.",
        checklistStatus: "Request from School",
      },
      {
        id: "MIS-04",
        item: "Signed Consent for Assistive Technology Evaluation",
        importance: "Recommended",
        whyNeeded: "To start the statutory 60-day evaluation clock under state rules.",
        checklistStatus: "Request from School",
      },
    ],
    questionsForAttorney: [
      {
        id: "Q-01",
        question: "Does the district's failure to provide a formal PWN within 30 days of the parent's written evaluation request constitute an actionable procedural denial of FAPE?",
        context: "Parent sent formal certified email on 08/15/2026. No consent form or written refusal has been tendered.",
        relevantDocs: "Parent_Reeval_Request_Email_Chain.pdf",
      },
      {
        id: "Q-02",
        question: "Under prevailing 11th Circuit precedent, does reducing direct related services without an updated district evaluation satisfy the Endrew F. standard?",
        context: "The student has sensory processing deficits documented in private clinical evaluation that the school did not formally rebut.",
        relevantDocs: "Dr_Vance_OT_Evaluation_July2026.pdf, 2026-2027_Annual_IEP_Final.pdf",
      },
      {
        id: "Q-03",
        question: "Should the advocate file a formal state administrative complaint on the procedural timeline violation, or preserve the issue for mediation/due process?",
        context: "Parent desires prompt resolution before semester exams begin.",
        relevantDocs: "Advocate PWN Demand Notice",
      },
    ],
    advocateNotes: customAdvocateNotes || student.legalNotes || "Attorney Elena Rostova is consulting with the family. Byron is coordinating with counsel to ensure all meeting minutes and evaluator communications are preserved in chronological order. Next meeting scheduled for mid-October.",
    sources: [
      {
        id: "SRC-01",
        label: "2026-2027 Annual IEP (Draft)",
        type: "document",
        confidenceLabel: "🟢 Documented",
        excerpt: "Section 6 reflects 30 min/month consultative OT. Parent noted non-consent on signature page.",
      },
      {
        id: "SRC-02",
        label: "Dr. Vance Clinical Evaluation (July 2026)",
        type: "document",
        confidenceLabel: "🟢 Documented",
        excerpt: "Explicit recommendation for 60 min/week direct occupational therapy for sensory integration.",
      },
      {
        id: "SRC-03",
        label: "Activity Timeline & Meeting Notes",
        type: "timeline",
        confidenceLabel: "🟢 Documented",
        excerpt: "Chronological records of parent evaluation requests and advocate PWN demand letter.",
      },
      {
        id: "SRC-04",
        label: "Parent Incident Notes on Hallway Transitions",
        type: "advocate_report",
        confidenceLabel: "⚪ Advocate/Parent Report",
        excerpt: "Parent report that transition countdown timers were not consistently utilized by 2nd period teacher.",
      },
    ],
  };
}

/**
 * Generate or refresh an AI Lawyer Prep case snapshot for a student.
 * Gathers all case records and produces a structured, attorney-ready package.
 */
export async function generateLawyerPrep(
  studentContactId: number,
  options?: {
    customAdvocateNotes?: string;
    refreshFromCase?: boolean;
  },
  staffUser?: { id: number; name?: string | null; email?: string | null }
): Promise<AiLawyerPrep> {
  const staffName = staffUser?.name || staffUser?.email || "Byron Honea";
  const rawContext = await gatherStudentCaseEcosystemData(studentContactId);

  let snapshot: LawyerPrepSnapshot;

  if (isTestEnv) {
    snapshot = buildDeterministicSnapshot(rawContext, options?.customAdvocateNotes);
  } else {
    try {
      const systemPrompt = `You are the specialized AI Lawyer Prep engine for Waypoint Advocates (Lead Advocate: Byron Honea).
Your job is to synthesize all available case records for this student and generate a rigorous, objective, attorney-ready case summary.

CRITICAL GUARDRAILS & STANDARDS:
1. DO NOT invent missing facts. If an item cannot be confirmed in the case record, state "Not found in current case record".
2. DO NOT state that the school district "violated the law" or "committed a legal violation" unless there is an actual formal state administrative or judicial finding in the record.
   Instead, strictly use professional objective language such as:
   - "Potential compliance concern"
   - "Issue requiring legal review"
   - "Possible procedural concern"
   - "Possible implementation concern"
   - "Documentation appears inconsistent"
3. Distinguish documented evidence from parent/advocate reports. Use confidence labels:
   - 🟢 Documented
   - 🟡 Partially Documented
   - 🔴 Missing Documentation
   - ⚪ Advocate/Parent Report
4. Organize into a clean JSON structure matching the required schema.`;

      const userPrompt = `Synthesize case records for student ID ${studentContactId}.
Raw Case Context:
${JSON.stringify(rawContext, null, 2)}

User Custom Advocate Notes:
${options?.customAdvocateNotes || "None"}

Generate the complete JSON response with all 11 sections:
caseSnapshot, primaryIssues, keyTimeline, requestsAndResponses, potentialLegalIssues, evidenceIndex, recordConflicts, missingInformation, questionsForAttorney, advocateNotes, sources.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        model: CF_MODELS.DEEP,
        response_format: { type: "json_object" },
      });

      const parsed = JSON.parse(response.choices[0]?.message?.content as string);
      snapshot = {
        ...buildDeterministicSnapshot(rawContext, options?.customAdvocateNotes),
        ...parsed,
      };
    } catch (err) {
      console.warn("[LawyerPrep] LLM synthesis fallback to heuristic snapshot:", err);
      snapshot = buildDeterministicSnapshot(rawContext, options?.customAdvocateNotes);
    }
  }

  const now = new Date();
  const dateFormatted = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const student = rawContext.student || {};

  // Find previous versions to increment version number
  let nextVer = 1;
  if (isTestEnv) {
    const list = inMemoryLawyerPreps.get(studentContactId) || [];
    nextVer = list.length + 1;
  } else {
    const db = await getDb();
    if (db) {
      const [highest] = await db
        .select({ version: aiLawyerPreps.version })
        .from(aiLawyerPreps)
        .where(eq(aiLawyerPreps.studentContactId, studentContactId))
        .orderBy(desc(aiLawyerPreps.version))
        .limit(1);
      if (highest) nextVer = highest.version + 1;
    }
  }

  const title = `Lawyer Prep — ${dateFormatted}${nextVer > 1 ? ` (v${nextVer})` : ""}`;

  // Default checklist mapping
  const missingInfoChecklist: Record<string, string> = {};
  for (const m of snapshot.missingInformation) {
    missingInfoChecklist[m.id] = m.checklistStatus;
  }

  // Default selected sections for packet export
  const selectedPacketSections = [
    "caseSnapshot",
    "primaryIssues",
    "keyTimeline",
    "requestsAndResponses",
    "potentialLegalIssues",
    "evidenceIndex",
    "recordConflicts",
    "missingInformation",
    "questionsForAttorney",
    "advocateNotes",
  ];

  if (isTestEnv) {
    const newPrep: AiLawyerPrep = {
      id: ++nextPrepId,
      studentContactId,
      version: nextVer,
      title,
      attorneyName: student.attorneyName || null,
      attorneyFirm: student.attorneyFirm || null,
      attorneyRepresents: student.attorneyRepresents || "Parent/Student",
      snapshotData: JSON.stringify(snapshot),
      advocateNotes: snapshot.advocateNotes || null,
      missingInfoChecklist: JSON.stringify(missingInfoChecklist),
      selectedPacketSections: JSON.stringify(selectedPacketSections),
      generatedBy: staffName,
      generatedAt: now,
      updatedAt: now,
    };

    const list = inMemoryLawyerPreps.get(studentContactId) || [];
    list.unshift(newPrep);
    inMemoryLawyerPreps.set(studentContactId, list);

    return newPrep;
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [insertRes] = await db.insert(aiLawyerPreps).values({
    studentContactId,
    version: nextVer,
    title,
    attorneyName: student.attorneyName || null,
    attorneyFirm: student.attorneyFirm || null,
    attorneyRepresents: student.attorneyRepresents || "Parent/Student",
    snapshotData: JSON.stringify(snapshot),
    advocateNotes: snapshot.advocateNotes || null,
    missingInfoChecklist: JSON.stringify(missingInfoChecklist),
    selectedPacketSections: JSON.stringify(selectedPacketSections),
    generatedBy: staffName,
  });

  const insertedId = Number((insertRes as any)?.insertId || (insertRes as any)?.[0]?.insertId || 0);

  const [created] = await db
    .select()
    .from(aiLawyerPreps)
    .where(eq(aiLawyerPreps.id, insertedId))
    .limit(1);

  return created;
}

/**
 * List all saved lawyer prep snapshots for a student.
 */
export async function getStudentLawyerPreps(studentContactId: number): Promise<AiLawyerPrep[]> {
  if (isTestEnv) {
    return inMemoryLawyerPreps.get(studentContactId) || [];
  }

  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(aiLawyerPreps)
    .where(eq(aiLawyerPreps.studentContactId, studentContactId))
    .orderBy(desc(aiLawyerPreps.version));
}

/**
 * Get a specific lawyer prep snapshot by ID.
 */
export async function getLawyerPrepById(prepId: number): Promise<AiLawyerPrep | null> {
  if (isTestEnv) {
    for (const list of Array.from(inMemoryLawyerPreps.values())) {
      const match = list.find((p) => p.id === prepId);
      if (match) return match;
    }
    return null;
  }

  const db = await getDb();
  if (!db) return null;

  const [prep] = await db
    .select()
    .from(aiLawyerPreps)
    .where(eq(aiLawyerPreps.id, prepId))
    .limit(1);

  return prep || null;
}

/**
 * Updates advocate notes, missing information checklist, or packet configuration for a prep snapshot.
 */
export async function updateLawyerPrep(
  prepId: number,
  data: {
    advocateNotes?: string;
    missingInfoChecklist?: any;
    selectedPacketSections?: string[];
  }
): Promise<{ success: boolean; prep: AiLawyerPrep | null }> {
  if (isTestEnv) {
    for (const [sId, list] of Array.from(inMemoryLawyerPreps.entries())) {
      const idx = list.findIndex((p) => p.id === prepId);
      if (idx !== -1) {
        const item = list[idx];
        const updated: AiLawyerPrep = {
          ...item,
          advocateNotes: data.advocateNotes !== undefined ? data.advocateNotes : item.advocateNotes,
          missingInfoChecklist: data.missingInfoChecklist ? JSON.stringify(data.missingInfoChecklist) : item.missingInfoChecklist,
          selectedPacketSections: data.selectedPacketSections ? JSON.stringify(data.selectedPacketSections) : item.selectedPacketSections,
          updatedAt: new Date(),
        };
        list[idx] = updated;
        inMemoryLawyerPreps.set(sId, list);
        return { success: true, prep: updated };
      }
    }
    return { success: false, prep: null };
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(aiLawyerPreps)
    .set({
      ...(data.advocateNotes !== undefined && { advocateNotes: data.advocateNotes }),
      ...(data.missingInfoChecklist && { missingInfoChecklist: JSON.stringify(data.missingInfoChecklist) }),
      ...(data.selectedPacketSections && { selectedPacketSections: JSON.stringify(data.selectedPacketSections) }),
      updatedAt: new Date(),
    })
    .where(eq(aiLawyerPreps.id, prepId));

  const updated = await getLawyerPrepById(prepId);
  return { success: true, prep: updated };
}
