import { queryCloudflareD1, getLocalDbClient } from '../server/_core/d1Client';

async function main() {
  console.log("=== Adding Test Student: Elijah Santiago ===");

  const parentId = 120037;
  const studentId = 120038;
  const caseId = "WP-2026-0031";

  const parentData = {
    id: parentId,
    ownerId: 1,
    firstName: "Elena",
    lastName: "Santiago",
    email: "elena.santiago@example.com",
    phone: "(404) 555-0188",
    company: "Santiago Family",
    jobTitle: "Parent",
    address: "1420 Peachtree St NE",
    city: "Atlanta",
    state: "GA",
    zipCode: "30309",
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
    notes: "Parent of Elijah Santiago. Primary contact for IEP meetings and educational advocacy."
  };

  const studentData = {
    id: studentId,
    ownerId: 1,
    firstName: "Elijah",
    lastName: "Santiago",
    email: "elijah.santiago.student@example.com",
    phone: "(404) 555-0188",
    company: "Santiago Family",
    jobTitle: "Student",
    caseId: caseId,
    parentContactId: parentId,
    schoolName: "Midtown High School",
    gradeLevel: "7th Grade",
    countyDistrict: "Atlanta Public Schools",
    dateOfBirth: "2013-05-14",
    planType: "IEP",
    planTier: "$105",
    iepEligibility: "Other Health Impairment (OHI) / ADHD",
    diagnosis: "ADHD (Combined Type), Executive Functioning Deficits, Specific Learning Disorder in Reading",
    challenges: "Sustained attention during independent work, organizational processing, task initiation, accommodations for extended time on tests and visual task breakdowns.",
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
    zipCode: "30309",
    country: "USA",
    timezone: "America/New_York",
    notes: "Active 7th grade student at Midtown High School with an active IEP under OHI/ADHD. Currently receiving executive functioning support and reading accommodations."
  };

  const local = getLocalDbClient();

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

    // Local SQLite
    try {
      await local.execute({ sql, args: values });
      console.log(`✓ Upserted ${data.firstName} ${data.lastName} (ID: ${data.id}) in local SQLite`);
    } catch (err: any) {
      console.error(`✗ Local SQLite error for ${data.firstName}:`, err.message);
    }

    // Cloudflare D1
    try {
      const d1Res = await queryCloudflareD1(sql, values);
      console.log(`✓ Upserted ${data.firstName} ${data.lastName} (ID: ${data.id}) in Cloudflare D1:`, d1Res !== undefined ? 'OK' : 'Unknown');
    } catch (err: any) {
      console.error(`✗ Cloudflare D1 error for ${data.firstName}:`, err.message);
    }
  }

  // Upsert parent first
  await upsertContact(parentData);
  // Upsert student
  await upsertContact(studentData);

  console.log("=== Verification Query ===");
  const checkSql = `
    SELECT id, firstName, lastName, jobTitle, schoolName, gradeLevel, planType, parentContactId, caseId, accountStatus
    FROM contacts
    WHERE id IN (?, ?)
  `;

  const localCheck = await local.execute({ sql: checkSql, args: [parentId, studentId] });
  console.log("Local SQLite records:", JSON.stringify(localCheck.rows, null, 2));

  const d1Check = await queryCloudflareD1(checkSql, [parentId, studentId]);
  console.log("Cloudflare D1 records:", JSON.stringify(d1Check, null, 2));

  console.log("=== SUCCESS: Elijah Santiago added to both local and live Cloudflare D1 ===");
}

main().catch(console.error);
