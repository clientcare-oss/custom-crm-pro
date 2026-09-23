import fs from 'fs';
import path from 'path';
import { queryCloudflareD1, getLocalDbClient } from '../server/_core/d1Client';
import { parseAdvocateReadyDocument } from '../server/services/advocateReadyParser';

async function restore() {
  console.log('--- Step 1: Ensure meeting_workspaces table exists in D1 and local SQLite ---');
  
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS meeting_workspaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_contact_id INTEGER NOT NULL,
      appointment_id INTEGER,
      title TEXT DEFAULT 'IEP Meeting Workspace' NOT NULL,
      meeting_date TEXT,
      meeting_type TEXT DEFAULT 'Annual IEP Meeting',
      status TEXT DEFAULT 'PREPARING' NOT NULL,
      active_tab TEXT DEFAULT 'PREP' NOT NULL,
      prep_step TEXT DEFAULT 'iep_intel' NOT NULL,
      detected_iep_order TEXT,
      iep_intel_findings TEXT,
      parent_intel_concerns TEXT,
      parent_concern_statement TEXT,
      pcs_approved INTEGER DEFAULT 0 NOT NULL,
      pcs_last_approved_at TIMESTAMP,
      meeting_targets TEXT,
      parking_lot TEXT,
      additional_items TEXT,
      closeout_checks TEXT,
      completed_at TIMESTAMP,
      completed_summary TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `;

  // Execute on local SQLite
  try {
    const local = getLocalDbClient();
    await local.execute(createTableSql);
    console.log('✓ Created meeting_workspaces table in local SQLite');
  } catch (err: any) {
    console.warn('Local create table result:', err.message);
  }

  // Execute on Cloudflare D1
  try {
    await queryCloudflareD1(createTableSql);
    console.log('✓ Created meeting_workspaces table in Cloudflare D1');
  } catch (err: any) {
    console.warn('D1 create table result:', err.message);
  }

  console.log('--- Step 2: Read and parse Jeremiah Mitchell Advocate Ready Document ---');
  const txtPath = path.resolve(process.cwd(), 'client/public/Jeremiah_Mitchell_Advocate_Ready.txt');
  const fileContent = fs.readFileSync(txtPath, 'utf8');
  const parsed = parseAdvocateReadyDocument(fileContent);

  console.log(`Parsed ${parsed.targets.length} targets across sections:`, parsed.detectedOrder);

  console.log('--- Step 3: Insert / Upsert Jeremiah Mitchell into Contacts & Meeting Workspace ---');

  const studentContactId = 120034;
  const caseId = 'WP-2026-0029';
  const studentName = 'Jeremiah Mitchell';

  // Check if contact 120034 exists in contacts table
  const checkContactSql = `SELECT id, firstName, lastName, caseId FROM contacts WHERE id = ? OR caseId = ?`;
  const existingContacts = await queryCloudflareD1(checkContactSql, [studentContactId, caseId]);
  console.log('Existing contacts found:', existingContacts);

  if (!existingContacts || existingContacts.length === 0) {
    const insertContactSql = `
      INSERT INTO contacts (id, ownerId, firstName, lastName, caseId, schoolName, gradeLevel, planType, pipelineStage, accountStatus)
      VALUES (?, 1, 'Jeremiah', 'Mitchell', 'WP-2026-0029', 'Maynard Holbrook Jackson High School', '11th Grade', 'IEP', 'Active', 'Active')
    `;
    try {
      await queryCloudflareD1(insertContactSql, [studentContactId]);
      console.log('✓ Inserted Jeremiah Mitchell contact into D1');
    } catch (e: any) {
      console.log('Contact insert notice:', e.message);
    }
  }

  // Delete any empty/stub meeting workspaces for Jeremiah to avoid duplicates
  await queryCloudflareD1(`DELETE FROM meeting_workspaces WHERE student_contact_id = ?`, [studentContactId]);
  try {
    await getLocalDbClient().execute({ sql: `DELETE FROM meeting_workspaces WHERE student_contact_id = ?`, args: [studentContactId] });
  } catch (e) {}

  // Insert populated workspace with all 25 Targets
  const insertWorkspaceSql = `
    INSERT INTO meeting_workspaces (
      student_contact_id,
      title,
      meeting_date,
      meeting_type,
      status,
      active_tab,
      prep_step,
      detected_iep_order,
      meeting_targets,
      parking_lot,
      additional_items,
      closeout_checks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    studentContactId,
    `${studentName} — Annual IEP Meeting (Case #${caseId})`,
    'October 15, 2026 · 10:00 AM',
    'Annual IEP Meeting',
    'PREPARING',
    'BLUEPRINT',
    'ready',
    JSON.stringify(parsed.detectedOrder),
    JSON.stringify(parsed.targets),
    JSON.stringify([]),
    JSON.stringify([]),
    JSON.stringify({
      allRequestsRaised: false,
      pwnIdentified: false,
      agreedLocationsClear: false,
      followUpAssigned: false,
      nextMeetingDiscussed: false,
    }),
  ];

  await queryCloudflareD1(insertWorkspaceSql, values);
  try {
    await getLocalDbClient().execute({ sql: insertWorkspaceSql, args: values });
  } catch (e) {}

  console.log(`✓ Restored Jeremiah Mitchell's workspace with all ${parsed.targets.length} targets!`);

  // Verify
  const verifyD1 = await queryCloudflareD1(`SELECT id, student_contact_id, title, meeting_targets FROM meeting_workspaces WHERE student_contact_id = ?`, [studentContactId]);
  console.log('D1 Verification:', verifyD1.map((r: any) => ({
    id: r.id,
    studentId: r.student_contact_id,
    title: r.title,
    targetsCount: JSON.parse(r.meeting_targets).length,
  })));
}

restore().catch(console.error);
