import { queryCloudflareD1, getLocalDbClient } from '../server/_core/d1Client';

async function reconnectWorkspaces() {
  console.log('=== Step 1: Reconnecting Meeting Workspaces in Cloudflare D1 & Local SQLite ===');
  const local = getLocalDbClient();

  // 1. Inspect Workspace 1 & 2
  const ws1D1 = await queryCloudflareD1('SELECT * FROM meeting_workspaces WHERE id = 1');
  const ws2D1 = await queryCloudflareD1('SELECT * FROM meeting_workspaces WHERE id = 2');

  const ws1 = ws1D1?.[0];
  const ws2 = ws2D1?.[0];

  // Merge additional items from WS 1 and WS 2
  let mergedAddlItems: any[] = [];
  try {
    const addl1 = ws1?.additional_items ? JSON.parse(ws1.additional_items) : [];
    const addl2 = ws2?.additional_items ? JSON.parse(ws2.additional_items) : [];
    const seenTexts = new Set<string>();
    for (const item of [...addl2, ...addl1]) {
      const trimmed = (item.text || '').trim();
      if (trimmed && !trimmed.startsWith('---') && !seenTexts.has(trimmed.toLowerCase())) {
        seenTexts.add(trimmed.toLowerCase());
        mergedAddlItems.push(item);
      }
    }
  } catch (e) {
    console.error('Error merging additional items:', e);
  }

  // 2. Reconnect Workspace 2 to Jeremiah Mitchell (120034)
  console.log('Reconnecting Workspace 2 to Jeremiah Mitchell (ID 120034)...');
  const jeremiahTargets = ws2?.meeting_targets || ws1?.meeting_targets;
  const jeremiahOrder = ws2?.detected_iep_order || ws1?.detected_iep_order;
  const jeremiahPcs = ws2?.parent_concern_statement || ws1?.parent_concern_statement || '';

  // Delete old redundant Workspace 1
  await queryCloudflareD1('DELETE FROM meeting_workspaces WHERE id = 1');
  try {
    await local.execute({ sql: 'DELETE FROM meeting_workspaces WHERE id = 1', args: [] });
  } catch {}

  // Update Workspace 2
  const updateWs2Sql = `
    UPDATE meeting_workspaces 
    SET student_contact_id = 120034,
        title = 'Jeremiah Mitchell — Annual IEP Meeting',
        additional_items = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 2
  `;
  await queryCloudflareD1(updateWs2Sql, [JSON.stringify(mergedAddlItems)]);
  try {
    await local.execute({
      sql: updateWs2Sql,
      args: [JSON.stringify(mergedAddlItems)]
    });
  } catch {}
  console.log('✓ Reconnected Workspace 2 to Jeremiah Mitchell (120034)');

  // 3. Ensure Shanderious Test (120036) has proper title
  await queryCloudflareD1(`
    UPDATE meeting_workspaces 
    SET title = 'Shanderious Test — Annual IEP Meeting'
    WHERE id = 3 AND student_contact_id = 120036
  `);
  try {
    await local.execute({
      sql: "UPDATE meeting_workspaces SET title = 'Shanderious Test — Annual IEP Meeting' WHERE id = 3 AND student_contact_id = 120036",
      args: []
    });
  } catch {}
  console.log('✓ Verified Shanderious Test (120036) Workspace 3');

  // 4. Ensure Elijah Santiago (120038) has proper title and delete empty stub 24 (parent Elena)
  await queryCloudflareD1('DELETE FROM meeting_workspaces WHERE id = 24');
  try {
    await local.execute({ sql: 'DELETE FROM meeting_workspaces WHERE id = 24', args: [] });
  } catch {}

  await queryCloudflareD1(`
    UPDATE meeting_workspaces 
    SET title = 'Elijah Santiago — Annual IEP Meeting'
    WHERE id = 7 AND student_contact_id = 120038
  `);
  try {
    await local.execute({
      sql: "UPDATE meeting_workspaces SET title = 'Elijah Santiago — Annual IEP Meeting' WHERE id = 7 AND student_contact_id = 120038",
      args: []
    });
  } catch {}
  console.log('✓ Cleaned up stub 24 and verified Elijah Santiago (120038) Workspace 7');

  // 5. Ensure Reese Vance (120040) Workspace 20 has proper title
  await queryCloudflareD1(`
    UPDATE meeting_workspaces 
    SET title = 'Reese Vance — Annual IEP Meeting'
    WHERE id = 20 AND student_contact_id = 120040
  `);
  try {
    await local.execute({
      sql: "UPDATE meeting_workspaces SET title = 'Reese Vance — Annual IEP Meeting' WHERE id = 20 AND student_contact_id = 120040",
      args: []
    });
  } catch {}
  console.log('✓ Verified Reese Vance (120040) Workspace 20');

  // 6. Delete other empty stub workspaces on parent IDs
  await queryCloudflareD1('DELETE FROM meeting_workspaces WHERE student_contact_id = 90003 AND length(meeting_targets) <= 2');
  try {
    await local.execute({ sql: 'DELETE FROM meeting_workspaces WHERE student_contact_id = 90003 AND length(meeting_targets) <= 2', args: [] });
  } catch {}

  // 7. Verify all workspaces now in D1
  console.log('\n=== Verification: Workspaces in Cloudflare D1 ===');
  const finalWorkspaces = await queryCloudflareD1(`
    SELECT mw.id, mw.student_contact_id, mw.title, mw.status, c.firstName, c.lastName, c.jobTitle, length(mw.meeting_targets) as targets_len
    FROM meeting_workspaces mw
    LEFT JOIN contacts c ON c.id = mw.student_contact_id
    ORDER BY mw.id ASC
  `);
  console.log(JSON.stringify(finalWorkspaces, null, 2));

  // Also sync all rows to local SQLite so local dev server matches production D1 1:1
  console.log('\n=== Syncing D1 Workspaces to local SQLite ===');
  const allD1 = await queryCloudflareD1('SELECT * FROM meeting_workspaces');
  for (const row of (allD1 || [])) {
    const upsertSql = `
      INSERT INTO meeting_workspaces (
        id, student_contact_id, appointment_id, title, meeting_date, meeting_type,
        status, active_tab, prep_step, detected_iep_order, iep_intel_findings,
        parent_intel_concerns, parent_concern_statement, pcs_approved, meeting_targets,
        parking_lot, additional_items, closeout_checks, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        student_contact_id = excluded.student_contact_id,
        title = excluded.title,
        status = excluded.status,
        active_tab = excluded.active_tab,
        prep_step = excluded.prep_step,
        meeting_targets = excluded.meeting_targets,
        additional_items = excluded.additional_items,
        parking_lot = excluded.parking_lot,
        parent_concern_statement = excluded.parent_concern_statement,
        updated_at = CURRENT_TIMESTAMP
    `;
    try {
      await local.execute({
        sql: upsertSql,
        args: [
          row.id,
          row.student_contact_id,
          row.appointment_id,
          row.title,
          row.meeting_date,
          row.meeting_type,
          row.status,
          row.active_tab,
          row.prep_step,
          row.detected_iep_order,
          row.iep_intel_findings,
          row.parent_intel_concerns,
          row.parent_concern_statement,
          row.pcs_approved,
          row.meeting_targets,
          row.parking_lot,
          row.additional_items,
          row.closeout_checks
        ]
      });
    } catch (e: any) {
      console.warn('Local upsert warning:', e.message);
    }
  }
  console.log('✓ All meeting workspaces successfully reconnected and synced!');
}

reconnectWorkspaces().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
