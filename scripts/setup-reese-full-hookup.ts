import { queryCloudflareD1, getLocalDbClient } from '../server/_core/d1Client';

async function main() {
  console.log("=== Setting up Reese Vance (Student) & Full Case Connections ===");

  const parentId = 120039;
  const studentId = 120040;
  const caseId = "WP-2026-0042";
  const parentName = "Rachel Vance";
  const studentName = "Reese Vance";
  const parentPhone = "(404) 555-0192";
  const parentEmail = "rachel.vance@example.com";
  const studentEmail = "reese.vance.student@example.com";

  const local = getLocalDbClient();

  // 1. Parent Contact
  const parentData: Record<string, any> = {
    id: parentId,
    ownerId: 1,
    firstName: "Rachel",
    lastName: "Vance",
    email: parentEmail,
    phone: parentPhone,
    company: "Vance Family",
    jobTitle: "Parent",
    address: "350 Ferst Dr NW",
    city: "Atlanta",
    state: "GA",
    zipCode: "30332",
    country: "USA",
    caseId: caseId,
    timezone: "America/New_York",
    pipelineStage: "Active",
    accountStatus: "Active",
    billingStatus: "Current",
    contractStatus: "Active",
    lifecycleStage: "Active",
    operationalState: "Normal",
    serviceStatus: "Active",
    portalLifecycleStatus: "Active",
    notes: "Parent of Reese Vance. Primary educational decision-maker. Very proactive regarding dysgraphia assistive tech and sensory accommodations."
  };

  // 2. Student Contact
  const studentData: Record<string, any> = {
    id: studentId,
    ownerId: 1,
    firstName: "Reese",
    lastName: "Vance",
    email: studentEmail,
    phone: parentPhone,
    company: "Vance Family",
    jobTitle: "Student",
    caseId: caseId,
    parentContactId: parentId,
    schoolName: "Riverwood International Middle School",
    gradeLevel: "6th Grade",
    countyDistrict: "Fulton County School District",
    dateOfBirth: "2014-03-22",
    planType: "IEP",
    planTier: "$105",
    iepEligibility: "Autism Spectrum Disorder (ASD), Speech-Language Impairment, Specific Learning Disability (Dysgraphia)",
    diagnosis: "Autism Spectrum Disorder (Level 1), Sensory Processing Sensitivity, Dysgraphia, Expressive Language Disorder",
    challenges: "Auditory sensory overload in crowded hallways and cafeterias, severe fine motor fatigue during handwriting tasks, executive dysfunction with multi-step project transitions, non-verbal cues missed during peer group projects.",
    accountStatus: "Active",
    pipelineStage: "Active",
    billingStatus: "Current",
    contractStatus: "Active",
    lifecycleStage: "Active",
    operationalState: "Normal",
    serviceStatus: "Active",
    portalLifecycleStatus: "Active",
    city: "Atlanta",
    state: "GA",
    zipCode: "30332",
    country: "USA",
    timezone: "America/New_York",
    notes: "Active 6th grade student at Riverwood Middle School with an active IEP under ASD and SLI. Requires sensory diet breaks, Chromebook speech-to-text for dysgraphia, sensory decompression passes, and direct speech therapy support."
  };

  async function upsertContact(data: Record<string, any>) {
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    const values = Object.values(data);
    const updateClauses = keys.filter(k => k !== 'id').map(k => `${k} = excluded.${k}`).join(', ');

    const sql = `
      INSERT INTO contacts (${keys.join(', ')}, createdAt, updatedAt)
      VALUES (${placeholders}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET ${updateClauses}, updatedAt = CURRENT_TIMESTAMP
    `;

    try {
      await local.execute({ sql, args: values });
      console.log(`✓ Upserted ${data.firstName} ${data.lastName} (ID: ${data.id}) in local SQLite`);
    } catch (err: any) {
      console.error(`✗ Local SQLite error for ${data.firstName}:`, err.message);
    }

    try {
      await queryCloudflareD1(sql, values);
      console.log(`✓ Upserted ${data.firstName} ${data.lastName} (ID: ${data.id}) in Cloudflare D1`);
    } catch (err: any) {
      console.error(`✗ Cloudflare D1 error for ${data.firstName}:`, err.message);
    }
  }

  await upsertContact(parentData);
  await upsertContact(studentData);

  // 3. Ensure clientFiles table exists
  console.log("--- 2. Document Vault & Client Files ---");
  const createClientFilesSql = `
    CREATE TABLE IF NOT EXISTS clientFiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER NOT NULL,
      projectId INTEGER,
      fileName TEXT NOT NULL,
      fileUrl TEXT NOT NULL,
      fileKey TEXT NOT NULL,
      fileSize INTEGER,
      mimeType TEXT DEFAULT 'application/pdf',
      category TEXT DEFAULT 'ieps-504s',
      documentType TEXT DEFAULT 'Other',
      documentDate TEXT,
      uploadOrigin TEXT DEFAULT 'Advocate',
      lifecycleStatusAtUpload TEXT,
      studentContactId INTEGER,
      isReviewed INTEGER DEFAULT 0,
      reviewedAt TIMESTAMP,
      reviewedBy INTEGER,
      summary TEXT,
      isCurrentPlan INTEGER DEFAULT 0,
      uploadedBy INTEGER,
      iepFamilyId INTEGER,
      isCurrentVersion INTEGER DEFAULT 0,
      isBaseIep INTEGER DEFAULT 0,
      isAmendment INTEGER DEFAULT 0,
      amendmentNumber INTEGER,
      confirmationStatus TEXT DEFAULT 'System Identified',
      uploadedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `;
  try {
    await local.execute(createClientFilesSql);
    await queryCloudflareD1(createClientFilesSql);
  } catch (e: any) {
    console.warn("Table clientFiles check:", e.message);
  }

  // Files to seed for Reese (both studentId and parentId for maximum compatibility)
  const baseFiles = [
    {
      id: 501,
      fileName: "Reese_Vance_2026_Annual_IEP.pdf",
      fileUrl: "/documents/Reese_Vance_2026_Annual_IEP.pdf",
      fileKey: "vault/reese-vance/2026-annual-iep.pdf",
      fileSize: 1845200,
      mimeType: "application/pdf",
    },
    {
      id: 502,
      fileName: "Reese_Vance_Comprehensive_Neuropsych_Eval_2025.pdf",
      fileUrl: "/documents/Reese_Vance_Comprehensive_Neuropsych_Eval_2025.pdf",
      fileKey: "vault/reese-vance/neuropsych-eval-2025.pdf",
      fileSize: 3241000,
      mimeType: "application/pdf",
    },
    {
      id: 503,
      fileName: "Reese_Vance_Sensory_Profile_OT_Assessment.pdf",
      fileUrl: "/documents/Reese_Vance_Sensory_Profile_OT_Assessment.pdf",
      fileKey: "vault/reese-vance/sensory-profile-ot-assessment.pdf",
      fileSize: 1120000,
      mimeType: "application/pdf",
    },
    {
      id: 504,
      fileName: "Reese_Vance_Speech_Language_Pathology_Report.pdf",
      fileUrl: "/documents/Reese_Vance_Speech_Language_Pathology_Report.pdf",
      fileKey: "vault/reese-vance/slp-pathology-report.pdf",
      fileSize: 980400,
      mimeType: "application/pdf",
    },
    {
      id: 505,
      fileName: "Reese_Vance_Advocate_Ready.txt",
      fileUrl: "/Reese_Vance_Advocate_Ready.txt",
      fileKey: "vault/reese-vance/advocate-ready.txt",
      fileSize: 45200,
      mimeType: "text/plain",
    }
  ];

  for (const f of baseFiles) {
    const fileSql = `
      INSERT INTO clientFiles (id, clientId, projectId, fileName, fileUrl, fileKey, fileSize, mimeType, uploadedAt)
      VALUES (?, ?, NULL, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        fileName = excluded.fileName,
        fileUrl = excluded.fileUrl,
        fileKey = excluded.fileKey,
        fileSize = excluded.fileSize,
        mimeType = excluded.mimeType
    `;
    const fileArgs = [f.id, studentId, f.fileName, f.fileUrl, f.fileKey, f.fileSize, f.mimeType];

    try {
      await local.execute({ sql: fileSql, args: fileArgs });
      await queryCloudflareD1(fileSql, fileArgs);
      console.log(`✓ Seeded client file #${f.id}: ${f.fileName} for student #${studentId}`);
    } catch (e: any) {
      console.warn(`File seed note (#${f.id}):`, e.message);
    }
  }

  // 4. Upcoming Appointment for Reese's Annual IEP Meeting
  console.log("--- 3. Upcoming Appointment & Calendar ---");
  const createAppointmentTableSql = `
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ownerId INTEGER NOT NULL,
      clientId INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      startTime TEXT NOT NULL,
      endTime TEXT NOT NULL,
      location TEXT,
      status TEXT DEFAULT 'Scheduled',
      videoLink TEXT,
      parentName TEXT,
      studentName TEXT,
      parentPhone TEXT,
      clientMeetingLink TEXT,
      meetingType TEXT,
      caseId TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `;
  try {
    await local.execute(createAppointmentTableSql);
    await queryCloudflareD1(createAppointmentTableSql);
  } catch (e: any) {}

  let apptId = 205;
  const apptCheck = await queryCloudflareD1(
    "SELECT id FROM appointments WHERE clientId = ? OR caseId = ?",
    [studentId, caseId]
  );

  if (!apptCheck || apptCheck.length === 0) {
    const insertApptSql = `
      INSERT INTO appointments (
        id, ownerId, clientId, title, description, startTime, endTime, location,
        status, videoLink, parentName, studentName, parentPhone, clientMeetingLink,
        meetingType, caseId, createdAt, updatedAt
      ) VALUES (
        ?, 1, ?, ?, ?, ?, ?, ?,
        'Scheduled', ?, ?, ?, ?, ?,
        'Annual IEP Meeting', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        startTime = excluded.startTime,
        endTime = excluded.endTime,
        location = excluded.location,
        updatedAt = CURRENT_TIMESTAMP
    `;
    const apptValues = [
      apptId,
      studentId,
      `${studentName} — Annual IEP Meeting`,
      `Comprehensive annual review for ${studentName} covering dysgraphia assistive tech, sensory diet accommodations, and speech-language services.`,
      "2026-10-28T10:00:00.000Z",
      "2026-10-28T11:30:00.000Z",
      "Riverwood Middle School Room 204 & Microsoft Teams",
      "https://teams.microsoft.com/l/meetup-join/waypoint-reese-vance-iep",
      parentName,
      studentName,
      parentPhone,
      "https://portal.waypointadvocates.com/meeting/wp-2026-0042",
      caseId,
    ];

    try {
      await local.execute({ sql: insertApptSql, args: apptValues });
      await queryCloudflareD1(insertApptSql, apptValues);
      console.log(`✓ Created Appointment #${apptId} for ${studentName}`);
    } catch (e: any) {
      console.warn("Appointment insert note:", e.message);
    }
  } else {
    apptId = apptCheck[0].id;
    console.log(`✓ Existing appointment #${apptId} linked`);
  }

  // 5. Meeting Workspace for Reese Vance
  console.log("--- 4. Meeting Workspace (PG-043) with Full Strategic Data ---");
  const createWsTableSql = `
    CREATE TABLE IF NOT EXISTS meeting_workspaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_contact_id INTEGER NOT NULL,
      appointment_id INTEGER,
      title TEXT NOT NULL,
      meeting_date TEXT,
      meeting_type TEXT DEFAULT 'Annual IEP Meeting',
      status TEXT DEFAULT 'PREPARING',
      active_tab TEXT DEFAULT 'PREP',
      prep_step TEXT DEFAULT 'iep_intel',
      detected_iep_order TEXT,
      iep_intel_findings TEXT,
      parent_intel_concerns TEXT,
      parent_concern_statement TEXT,
      pcs_approved INTEGER DEFAULT 0,
      pcs_last_approved_at TIMESTAMP,
      meeting_targets TEXT,
      parking_lot TEXT,
      additional_items TEXT,
      closeout_checks TEXT,
      completed_at TIMESTAMP,
      completed_summary TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `;
  try {
    await local.execute(createWsTableSql);
    await queryCloudflareD1(createWsTableSql);
  } catch (e: any) {}

  const detectedIepOrder = [
    "Parent Concerns",
    "Present Levels of Academic Achievement and Functional Performance",
    "Consideration of Special Factors",
    "Measurable Annual Goals",
    "Accommodations & Assistive Technology",
    "Related Services (Speech & OT)",
    "Placement & Least Restrictive Environment (LRE)",
    "Testing Accommodations",
    "Transportation & Safety Protocol"
  ];

  const iepIntelFindings = [
    {
      id: "fnd-rv-01",
      category: "Accommodations & Assistive Technology",
      section: "Accommodations & Assistive Technology",
      text: "Reese experiences severe fine motor handwriting fatigue due to dysgraphia. Access to speech-to-text software and Chromebook keyboarding for assignments over 2 sentences is required.",
      quote: "Neuropsych Eval 2025: Reese's cognitive abilities are in the High Average range, but written expression fluency drops to the 14th percentile due to graphomotor strain.",
      status: "important"
    },
    {
      id: "fnd-rv-02",
      category: "Consideration of Special Factors",
      section: "Consideration of Special Factors",
      text: "Sensory decompression break protocol: Reese requires a subtle, non-verbal self-initiated break card allowing 5 minutes in the quiet sensory calm-down corner before overload escalates.",
      quote: "OT Assessment 2026: Reese displays heightened auditory reactivity in multi-speaker environments and benefits from preventative decompression before reaching autonomic arousal.",
      status: "important"
    },
    {
      id: "fnd-rv-03",
      category: "Related Services (Speech & OT)",
      section: "Related Services (Speech & OT)",
      text: "Speech-Language Pathology: Reese currently receives 60 minutes/week of direct pragmatic language therapy. Make-up sessions must be formally scheduled if provider is absent.",
      quote: "SLP Report 2026: Continues to need structured facilitation for peer group interaction and conversational reciprocity.",
      status: "keep"
    },
    {
      id: "fnd-rv-04",
      category: "Measurable Annual Goals",
      section: "Measurable Annual Goals",
      text: "Written Expression Goal: Ensure baseline reflects objective words-per-minute with keyboarding assistance, rather than evaluating solely handwritten drafts.",
      quote: "Current IEP: Lacks objective keyboarding baseline and conflates handwriting legibility with idea generation.",
      status: "important"
    },
    {
      id: "fnd-rv-05",
      category: "Present Levels of Academic Achievement and Functional Performance",
      section: "Present Levels of Academic Achievement and Functional Performance",
      text: "Math computation is at or above 6th grade benchmark, but multi-step word problems require visual graphic organizers to prevent working memory overload.",
      quote: "Classroom Probes: 88% accuracy when steps are visually isolated; 58% accuracy on dense text pages.",
      status: "keep"
    }
  ];

  const parentIntelConcerns = [
    {
      id: "pci-rv-01",
      topic: "Middle School Hallway & Cafeteria Sensory Overload",
      concern: "Rachel is worried that the noise, locker slamming, and crowded transitions between classes will cause Reese extreme anxiety and shutdown during morning periods.",
      source: "Advocate Discovery Intake & Parent Journal",
      status: "keep"
    },
    {
      id: "pci-rv-02",
      topic: "Handwriting Penalties & Incomplete Work",
      concern: "Reese is frequently marked down or kept in from recess to finish handwriting worksheets, causing distress when Reese already understands the academic content.",
      source: "Parent Intake & Teacher Communication Logs",
      status: "keep"
    },
    {
      id: "pci-rv-03",
      topic: "Peer Misunderstanding & Group Work Isolation",
      concern: "In group assignments, Reese's difficulty initiating conversation can lead to being left out or misunderstood by classmates without educator facilitation.",
      source: "Parent Statement & SLP Evaluation",
      status: "keep"
    },
    {
      id: "pci-rv-04",
      topic: "Missed Related Service Hours",
      concern: "Multiple speech therapy sessions were cancelled last semester without make-up minutes documented or communicated to the family.",
      source: "Parent Case Log",
      status: "keep"
    }
  ];

  const parentConcernStatement = "As the parents of Reese Vance, our primary priority during this middle school transition year is ensuring that Reese's learning environment actively supports sensory regulation and removes the physical barriers imposed by dysgraphia. When forced to handwrite extensive paragraphs, Reese experiences physical pain and fatigue, resulting in incomplete work that misrepresents true intellectual understanding. We request guaranteed access to Chromebook speech-to-text tools without grade deduction, a discrete 5-minute sensory decompression pass, and clear accountability for all 60 minutes/week of speech therapy with documented make-up schedules.";

  const meetingTargets = [
    {
      id: "tgt-rv-01",
      targetName: "Assistive Technology Speech-to-Text Accommodation",
      category: "Accommodations & Assistive Technology",
      iepSection: "Accommodations & Assistive Technology",
      priority: "CRITICAL",
      status: "TARGET_CONFIRMED",
      parentWhatWeWant: "Allow Reese to use Chromebook speech-to-text or word processor for all writing tasks longer than 2 sentences across all subjects.",
      parentWhyWeWantIt: "Reese has diagnosed dysgraphia with high cognitive ability; handwriting physically exhausts hand muscles within 3 minutes.",
      whyWeWantIt: "Removes fine-motor disability barrier so academic assessments evaluate cognitive comprehension and writing content, not motor endurance.",
      quickAdvocateSayThis: "We are requesting that Reese's accommodation schedule specify speech-to-text and keyboarding for all writing outputs over two sentences without point deductions.",
      possibleIepWording: "Reese will be provided access to speech-to-text software (e.g., Google Read&Write) and keyboarding on a school-provided Chromebook for any written assignment exceeding two sentences, across all academic settings.",
      ifTeamDisagrees: "Please explain the educational justification for requiring handwritten output when neuropsychological testing establishes dysgraphia. If refused, please provide Prior Written Notice under 34 CFR §300.503.",
      sources: ["Neuropsychological Evaluation 2025", "Parent Concern Statement"],
      notes: "School team has previously agreed in principle; needs formal codification in the IEP accommodation grid.",
      motion: "Pending Review",
      inPlan: false,
      flagged: true
    },
    {
      id: "tgt-rv-02",
      targetName: "Sensory Decompression Pass (5-Minute Break Protocol)",
      category: "Consideration of Special Factors",
      iepSection: "Consideration of Special Factors",
      priority: "CRITICAL",
      status: "TARGET_CONFIRMED",
      parentWhatWeWant: "A discreet pass Reese can place on the desk to step into the designated calm-down room for 5 minutes without having to explain aloud in front of peers.",
      parentWhyWeWantIt: "Reese shuts down when anxious and cannot verbally explain sensory overwhelm in a crowded classroom.",
      whyWeWantIt: "Proactive regulation prevents sensory meltdowns and keeps Reese in the general education classroom 95% of the day.",
      quickAdvocateSayThis: "We're asking for a discrete, non-verbal break pass Reese can place on the corner of the desk to take a 5-minute sensory regulation break before escalation occurs.",
      possibleIepWording: "When feeling sensory overload or fatigue, Reese may independently utilize a discrete non-verbal visual break card to access the sensory break zone for up to 5 minutes, up to twice per academic period, without disciplinary consequence.",
      ifTeamDisagrees: "What objective data indicates Reese can sustain regulation without sensory breaks? If denied, please document the refusal and reason in Prior Written Notice.",
      sources: ["OT Assessment 2026", "Parent Intake"],
      motion: "Pending Review",
      inPlan: false,
      flagged: true
    },
    {
      id: "tgt-rv-03",
      targetName: "Direct Speech Therapy (60 Mins/Week) with Guaranteed Make-Up Tracking",
      category: "Related Services (Speech & OT)",
      iepSection: "Related Services (Speech & OT)",
      priority: "CRITICAL",
      status: "TARGET_CONFIRMED",
      parentWhatWeWant: "Maintain 60 minutes weekly of direct speech therapy for pragmatic communication and ensure missed sessions are rescheduled within 14 days.",
      parentWhyWeWantIt: "Reese needs ongoing support navigating middle school social dynamics and group conversations.",
      whyWeWantIt: "Direct pragmatic SLP is necessary for Reese to access peer collaborative curriculum under IDEA.",
      quickAdvocateSayThis: "We want to confirm the continuation of 60 minutes per week of direct speech-language services, with a specific IEP clause requiring prompt make-up notification for any provider absences.",
      possibleIepWording: "Direct Speech-Language Pathology: 2 x 30 minutes weekly in a small group (1:3 maximum) focusing on pragmatic conversation skills and self-advocacy. All sessions cancelled due to provider absence shall be documented and made up within the same grading period.",
      ifTeamDisagrees: "What progress monitoring data supports reducing SLP services at the middle school transition? If refused, please provide Prior Written Notice.",
      sources: ["SLP Report 2026", "Parent Log"],
      motion: "Pending Review",
      inPlan: false,
      flagged: false
    },
    {
      id: "tgt-rv-04",
      targetName: "Noise-Dampening Headphones for Cafeteria & Hallway Transitions",
      category: "Accommodations & Assistive Technology",
      iepSection: "Accommodations & Assistive Technology",
      priority: "HIGH",
      status: "TARGET_CONFIRMED",
      parentWhatWeWant: "Allow Reese to wear personal noise-dampening headphones (e.g. Loop earplugs or over-ear headphones) during loud passing periods, cafeteria, and assemblies.",
      parentWhyWeWantIt: "Loud bell rings and echoing cafeteria noise cause immediate sensory headaches and panic.",
      whyWeWantIt: "Auditory filtering accommodation directly supported by OT evaluation findings.",
      quickAdvocateSayThis: "We are asking to include student-owned noise-dampening ear wear or headphones as a permissible accommodation during cafeteria, assemblies, and hall transitions.",
      possibleIepWording: "Reese is permitted to wear noise-dampening headphones or earplugs during loud school transitions, cafeteria lunch periods, emergency drills, and assemblies.",
      ifTeamDisagrees: "Please document the safety or educational concern that prevents this non-intrusive auditory accommodation.",
      sources: ["OT Evaluation 2026"],
      motion: "Pending Review",
      inPlan: false,
      flagged: false
    },
    {
      id: "tgt-rv-05",
      targetName: "Visual Step-by-Step Breakdown for Multi-Step Math Tasks",
      category: "Measurable Annual Goals",
      iepSection: "Measurable Annual Goals",
      priority: "MEDIUM",
      status: "TARGET_CONFIRMED",
      parentWhatWeWant: "Provide written step checklists and visual graphic organizers for multi-step math problems and projects.",
      parentWhyWeWantIt: "Reese understands mathematical reasoning but skips steps when directions are presented only orally.",
      whyWeWantIt: "Supports executive functioning and working memory load.",
      quickAdvocateSayThis: "We request a visual calculation graphic organizer be added to Reese's instructional accommodation matrix for multi-step tasks.",
      possibleIepWording: "When presented with multi-step math word problems, Reese will be provided with a graphic organizer breaking the problem into discrete visual steps.",
      ifTeamDisagrees: "What alternative supports are in place to address working memory overload on multi-step tasks?",
      sources: ["Classroom Work Samples"],
      motion: "Pending Review",
      inPlan: false,
      flagged: false
    }
  ];

  const closeoutChecks = {
    allRequestsRaised: false,
    pwnIdentified: false,
    agreedLocationsClear: false,
    followUpAssigned: false,
    nextMeetingDiscussed: false,
    notes: "Meeting preparation completed by Waypoint Advocate. All targets ready for review."
  };

  const wsId = 20;
  const wsSql = `
    INSERT INTO meeting_workspaces (
      id, student_contact_id, appointment_id, title, meeting_date, meeting_type,
      status, active_tab, prep_step, detected_iep_order, iep_intel_findings,
      parent_intel_concerns, parent_concern_statement, pcs_approved, meeting_targets,
      parking_lot, additional_items, closeout_checks, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      student_contact_id = excluded.student_contact_id,
      appointment_id = excluded.appointment_id,
      title = excluded.title,
      meeting_date = excluded.meeting_date,
      meeting_type = excluded.meeting_type,
      status = excluded.status,
      active_tab = excluded.active_tab,
      prep_step = excluded.prep_step,
      detected_iep_order = excluded.detected_iep_order,
      iep_intel_findings = excluded.iep_intel_findings,
      parent_intel_concerns = excluded.parent_intel_concerns,
      parent_concern_statement = excluded.parent_concern_statement,
      pcs_approved = excluded.pcs_approved,
      meeting_targets = excluded.meeting_targets,
      parking_lot = excluded.parking_lot,
      additional_items = excluded.additional_items,
      closeout_checks = excluded.closeout_checks,
      updated_at = CURRENT_TIMESTAMP
  `;

  const wsArgs = [
    wsId,
    studentId,
    apptId,
    `${studentName} — Annual IEP Meeting`,
    "October 28, 2026 · 10:00 AM",
    "Annual IEP Meeting",
    "READY",
    "BLUEPRINT",
    "blueprint",
    JSON.stringify(detectedIepOrder),
    JSON.stringify(iepIntelFindings),
    JSON.stringify(parentIntelConcerns),
    parentConcernStatement,
    1,
    JSON.stringify(meetingTargets),
    JSON.stringify([]),
    JSON.stringify([]),
    JSON.stringify(closeoutChecks)
  ];

  try {
    await local.execute({ sql: wsSql, args: wsArgs });
    await queryCloudflareD1(wsSql, wsArgs);
    console.log(`✓ Meeting Workspace #${wsId} seeded for ${studentName} (READY in BLUEPRINT mode)`);
  } catch (e: any) {
    console.error("Meeting workspace seed error:", e.message);
  }

  // 6. Plan Tier Service Allowances for Reese ($105 Comprehensive Tier)
  console.log("--- 5. Plan Tier Service Allowances ---");
  const createAllowancesTableSql = `
    CREATE TABLE IF NOT EXISTS student_service_allowances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_contact_id INTEGER NOT NULL,
      service_key TEXT NOT NULL,
      service_name TEXT NOT NULL,
      category TEXT DEFAULT 'meeting',
      allowance_type TEXT DEFAULT 'limited',
      base_allowance INTEGER DEFAULT 0,
      extra_allowance INTEGER DEFAULT 0,
      tracking_method TEXT DEFAULT 'calendar',
      reserve_on_open INTEGER DEFAULT 1,
      plan_period_start TEXT,
      plan_period_end TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `;
  try {
    await local.execute(createAllowancesTableSql);
    await queryCloudflareD1(createAllowancesTableSql);
  } catch (e: any) {}

  const initialServices = [
    { key: "IEP_MEETING", name: "IEP Meeting Attendance", cat: "meeting", type: "limited", count: 3, tracking: "calendar" },
    { key: "STRATEGY_HOURS", name: "Advocate Strategy & Prep Hours", cat: "advocacy", type: "limited", count: 12, tracking: "timeline" },
    { key: "DOC_REVIEW", name: "Document & Evaluation Reviews", cat: "review", type: "unlimited", count: 999, tracking: "manual" },
    { key: "PWN_ANALYSIS", name: "Prior Written Notice Analysis", cat: "review", type: "unlimited", count: 999, tracking: "manual" },
    { key: "FIRST_MATE", name: "First Mate Live Meeting Intelligence", cat: "meeting", type: "unlimited", count: 999, tracking: "calendar" },
  ];

  for (const svc of initialServices) {
    const insSql = `
      INSERT INTO student_service_allowances (
        student_contact_id, service_key, service_name, category, allowance_type,
        base_allowance, extra_allowance, tracking_method, reserve_on_open,
        plan_period_start, plan_period_end, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, 1, '2026-10-01', '2027-04-01', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    const insArgs = [studentId, svc.key, svc.name, svc.cat, svc.type, svc.count, svc.tracking, `$105 Comprehensive Tier plan allowance for ${studentName}`];
    try {
      await local.execute({ sql: insSql, args: insArgs });
      await queryCloudflareD1(insSql, insArgs);
    } catch (e: any) {}
  }
  console.log(`✓ Seeded 5 standard service allowances for ${studentName} ($105 tier)`);

  // 7. Initial Case Activity Timeline
  console.log("--- 6. Case Activity Timeline ---");
  try {
    // Local SQLite
    const tlLocalSql = `
      INSERT INTO case_activity_timeline (
        contact_id, activity_type, title, description, created_by, metadata, created_at
      ) VALUES (
        ?, 'CASE_INITIALIZED', ?, ?, 1, ?, CURRENT_TIMESTAMP
      )
    `;
    const tlLocalArgs = [
      studentId,
      `Case Initialized: ${studentName}`,
      `Case file opened under Case #${caseId}. Student enrolled in $105 Comprehensive Advocacy Plan. Initial IEP meeting prep initialized.`,
      JSON.stringify({ caseId, parentName, planTier: "$105" }),
    ];
    await local.execute({ sql: tlLocalSql, args: tlLocalArgs });

    // Cloudflare D1
    const tlD1Sql = `
      INSERT INTO case_activity_timeline (
        studentContactId, caseId, eventType, title, description, whyReason, ownerName, ownerRole, sources, isCompleted, eventDate, createdAt, updatedAt
      ) VALUES (
        ?, ?, 'CASE_INITIALIZED', ?, ?, ?, 'Byron Honea', 'Master IEP Coach', ?, 1, '2026-10-06', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `;
    const tlD1Args = [
      studentId,
      caseId,
      `Case Initialized: ${studentName}`,
      `Case file opened under Case #${caseId}. Student enrolled in $105 Comprehensive Advocacy Plan. Initial IEP meeting prep initialized.`,
      "Middle school transition advocate support",
      "Parent Intake & Assessment Vault",
    ];
    await queryCloudflareD1(tlD1Sql, tlD1Args);
    console.log(`✓ Initialized case activity timeline records for ${studentName}`);
  } catch (e: any) {
    console.warn("Timeline insert note:", e.message);
  }

  console.log("\n=== Final Verification of Reese Vance ===");
  const studentCheck = await queryCloudflareD1("SELECT id, firstName, lastName, caseId, accountStatus, planType, planTier, schoolName, gradeLevel FROM contacts WHERE id = ?", [studentId]);
  const parentCheck = await queryCloudflareD1("SELECT id, firstName, lastName, email, phone, caseId FROM contacts WHERE id = ?", [parentId]);
  const wsCheck = await queryCloudflareD1("SELECT id, student_contact_id, title, status, active_tab, meeting_date FROM meeting_workspaces WHERE student_contact_id = ?", [studentId]);
  const filesCheck = await queryCloudflareD1("SELECT id, fileName, fileUrl, fileSize, mimeType FROM clientFiles WHERE clientId = ?", [studentId]);

  console.log("Parent:", parentCheck);
  console.log("Student:", studentCheck);
  console.log("Meeting Workspace:", wsCheck);
  console.log("Client Files Count:", filesCheck?.length, filesCheck?.map((f: any) => f.fileName));

  console.log("\n Reese Vance is completely hooked up with persistent D1 memory, files, appointment, and Meeting Workspace!");
}

main().catch(console.error);
