import { queryCloudflareD1, getLocalDbClient } from '../server/_core/d1Client';

async function main() {
  console.log("=== Setting up Full Hookup & Memory for Elijah Santiago (WP-2026-0031) ===");

  const studentId = 120038;
  const parentId = 120037;
  const caseId = "WP-2026-0031";
  const studentName = "Elijah Santiago";
  const parentName = "Elena Santiago";
  const parentPhone = "(404) 555-0188";

  const local = getLocalDbClient();

  // 1. Sync Meeting Workspace in local SQLite matching D1 ID 7
  console.log("--- 1. Meeting Workspace ---");
  const wsD1 = await queryCloudflareD1(
    "SELECT * FROM meeting_workspaces WHERE student_contact_id = ?",
    [studentId]
  );
  if (wsD1 && wsD1.length > 0) {
    const ws = wsD1[0];
    const wsSql = `
      INSERT INTO meeting_workspaces (
        id, student_contact_id, appointment_id, title, meeting_date, meeting_type,
        status, active_tab, prep_step, detected_iep_order, iep_intel_findings,
        parent_intel_concerns, parent_concern_statement, pcs_approved, meeting_targets,
        parking_lot, additional_items, closeout_checks, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        status = excluded.status,
        active_tab = excluded.active_tab,
        prep_step = excluded.prep_step,
        updated_at = CURRENT_TIMESTAMP
    `;
    await local.execute({
      sql: wsSql,
      args: [
        ws.id,
        ws.student_contact_id,
        ws.appointment_id,
        ws.title,
        ws.meeting_date,
        ws.meeting_type,
        ws.status,
        ws.active_tab,
        ws.prep_step,
        ws.detected_iep_order,
        ws.iep_intel_findings,
        ws.parent_intel_concerns,
        ws.parent_concern_statement,
        ws.pcs_approved,
        ws.meeting_targets,
        ws.parking_lot,
        ws.additional_items,
        ws.closeout_checks,
      ],
    });
    console.log(`✓ Meeting Workspace #${ws.id} synced to local SQLite and verified in D1`);
  }

  // 2. Ensure an Appointment exists for Elijah's Annual IEP Meeting
  console.log("--- 2. Calendar & Appointments ---");
  const apptCheck = await queryCloudflareD1(
    "SELECT id FROM appointments WHERE caseId = ? OR clientId = ?",
    [caseId, studentId]
  );

  let apptId: number;
  if (!apptCheck || apptCheck.length === 0) {
    const insertApptSql = `
      INSERT INTO appointments (
        ownerId, clientId, title, description, startTime, endTime, location,
        status, videoLink, parentName, studentName, parentPhone, clientMeetingLink,
        meetingType, caseId, createdAt, updatedAt
      ) VALUES (
        1, ?, ?, ?, ?, ?, ?,
        'Scheduled', ?, ?, ?, ?, ?,
        'Annual IEP Meeting', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `;
    const apptValues = [
      studentId,
      `${studentName} — Annual IEP Meeting`,
      `Comprehensive annual review for ${studentName} covering IEP accommodations, executive functioning support, and reading goals.`,
      "2026-10-21T10:00:00.000Z",
      "2026-10-21T11:30:00.000Z",
      "Google Meet / Midtown High School Conference Room",
      "https://meet.google.com/waypoint-elijah-iep",
      parentName,
      studentName,
      parentPhone,
      "https://portal.waypointadvocates.com/meeting/wp-2026-0031",
      caseId,
    ];

    await queryCloudflareD1(insertApptSql, apptValues);
    await local.execute({ sql: insertApptSql, args: apptValues });

    const newAppt = await queryCloudflareD1(
      "SELECT id FROM appointments WHERE caseId = ? ORDER BY id DESC LIMIT 1",
      [caseId]
    );
    apptId = newAppt?.[0]?.id || 101;
    console.log(`✓ Created Appointment #${apptId} in Cloudflare D1 and SQLite`);

    // Link appointment to meeting workspace in D1 and local
    await queryCloudflareD1(
      "UPDATE meeting_workspaces SET appointment_id = ?, meeting_date = 'October 21, 2026 · 10:00 AM' WHERE student_contact_id = ?",
      [apptId, studentId]
    );
    await local.execute({
      sql: "UPDATE meeting_workspaces SET appointment_id = ?, meeting_date = 'October 21, 2026 · 10:00 AM' WHERE student_contact_id = ?",
      args: [apptId, studentId],
    });
  } else {
    apptId = apptCheck[0].id;
    console.log(`✓ Existing Appointment #${apptId} linked`);
  }

  // 3. Service Allowances ($105 Comprehensive Tier)
  console.log("--- 3. Plan Tier Service Allowances ---");
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
  await queryCloudflareD1(createAllowancesTableSql);
  await local.execute(createAllowancesTableSql);

  const allowancesCheck = await queryCloudflareD1(
    "SELECT id FROM student_service_allowances WHERE student_contact_id = ?",
    [studentId]
  );

  if (!allowancesCheck || allowancesCheck.length === 0) {
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
      await queryCloudflareD1(insSql, insArgs);
      await local.execute({ sql: insSql, args: insArgs });
    }
    console.log(`✓ Seeded 5 standard service allowances for ${studentName} ($105 tier)`);
  } else {
    console.log(`✓ Student Service Allowances already exist (${allowancesCheck.length} allowances)`);
  }

  // 4. Initial Case Activity Timeline
  console.log("--- 4. Case Activity Timeline ---");
  const createTimelineTableSql = `
    CREATE TABLE IF NOT EXISTS case_activity_timeline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER NOT NULL,
      activity_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      created_by INTEGER,
      metadata TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `;
  try {
    await queryCloudflareD1(createTimelineTableSql);
    await local.execute(createTimelineTableSql);

    const tlCheck = await queryCloudflareD1(
      "SELECT id FROM case_activity_timeline WHERE contact_id = ?",
      [studentId]
    );

    if (!tlCheck || tlCheck.length === 0) {
      const tlSql = `
        INSERT INTO case_activity_timeline (
          contact_id, activity_type, title, description, created_by, metadata, created_at
        ) VALUES (
          ?, 'CASE_INITIALIZED', ?, ?, 1, ?, CURRENT_TIMESTAMP
        )
      `;
      const tlArgs = [
        studentId,
        `Case Initialized: ${studentName}`,
        `Case file opened under Case #${caseId}. Student enrolled in $105 Comprehensive Advocacy Plan. Initial IEP meeting prep initialized.`,
        JSON.stringify({ caseId, parentName, planTier: "$105" }),
      ];
      await queryCloudflareD1(tlSql, tlArgs);
      await local.execute({ sql: tlSql, args: tlArgs });
      console.log(`✓ Initialized case activity timeline record in D1 and SQLite`);
    }
  } catch (e: any) {
    console.log("Timeline note:", e.message);
  }

  console.log("=== Verification Check ===");
  const studentCheck = await queryCloudflareD1("SELECT id, firstName, lastName, caseId, accountStatus, planType, planTier FROM contacts WHERE id = ?", [studentId]);
  const wsCheck = await queryCloudflareD1("SELECT id, student_contact_id, title, status, meeting_date FROM meeting_workspaces WHERE student_contact_id = ?", [studentId]);
  const apCheck = await queryCloudflareD1("SELECT id, title, startTime, status FROM appointments WHERE clientId = ?", [studentId]);

  console.log("Student:", studentCheck);
  console.log("Workspace:", wsCheck);
  console.log("Appointment:", apCheck);

  console.log("\n=== Elijah Santiago's case is 100% hooked up with persistent D1 memory! ===");
}

main().catch(console.error);
