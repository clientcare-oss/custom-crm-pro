import { queryCloudflareD1, getLocalDbClient } from '../server/_core/d1Client';

async function main() {
  console.log('--- Step 1: Querying Elijah Santiago workspace from D1 ---');
  const rows = await queryCloudflareD1(
    'SELECT * FROM meeting_workspaces WHERE student_contact_id = 120038 ORDER BY id DESC LIMIT 1'
  );

  if (!rows || rows.length === 0) {
    console.error('No workspace found for studentContactId 120038');
    process.exit(1);
  }

  const ws = rows[0];
  console.log(`Found Workspace ID: ${ws.id}, Title: ${ws.title}`);

  const targets = JSON.parse(ws.meeting_targets || '[]');
  console.log(`Parsed Targets Count: ${targets.length}`);

  // 1. Derive rich IEP Intel Findings from targets
  const iepFindings = targets
    .filter((t: any) => t.iepSection !== 'Parent Concerns')
    .map((t: any, idx: number) => ({
      id: `fnd-imp-${idx + 1}`,
      category: t.iepSection || 'Accommodations / Supports',
      section: t.iepSection || 'Accommodations / Supports',
      text: `${t.targetName}: ${t.whyWeWantIt || t.quickAdvocateSayThis || ''}`,
      quote: t.supportingEvidence || t.possibleIepWording || undefined,
      status: (t.iepSection === 'Accommodations / Supports' || t.iepSection === 'Special Education Services') ? 'important' : 'keep',
      isCustom: false,
    }));

  // 2. Derive Parent Intel Concerns from targets
  const parentConcerns = targets
    .filter((t: any) => t.iepSection === 'Parent Concerns' || t.parentWhatWeWant || t.parentWhyWeWantIt)
    .map((t: any, idx: number) => ({
      id: `pci-imp-${idx + 1}`,
      topic: t.targetName,
      concern: t.parentWhyWeWantIt || t.whyWeWantIt || t.parentWhatWeWant || t.quickAdvocateSayThis || '',
      source: t.sources?.[0] || 'Advocate Ready Document / Parent Brief',
      status: 'keep',
      isCustom: false,
    }));

  console.log(`Derived IEP Intel Findings: ${iepFindings.length}`);
  console.log(`Derived Parent Intel Concerns: ${parentConcerns.length}`);

  const updateSql = `
    UPDATE meeting_workspaces
    SET
      iep_intel_findings = ?,
      parent_intel_concerns = ?,
      active_tab = 'BLUEPRINT',
      prep_step = 'blueprint',
      pcs_approved = 1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  const values = [
    JSON.stringify(iepFindings),
    JSON.stringify(parentConcerns),
    ws.id,
  ];

  console.log('--- Step 2: Updating Remote Cloudflare D1 ---');
  await queryCloudflareD1(updateSql, values);
  console.log('Successfully updated Cloudflare D1!');

  console.log('--- Step 3: Updating Local SQLite Shadow DB ---');
  try {
    const local = getLocalDbClient();
    await local.execute({
      sql: updateSql,
      args: values,
    });
    console.log('Successfully updated Local SQLite Shadow DB!');
  } catch (e: any) {
    console.warn('Local update warning:', e.message);
  }

  console.log('=== All workspace parsing items for Elijah Santiago are now fully synchronized and stored! ===');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
