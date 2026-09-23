const { getLocalDbClient, queryCloudflareD1 } = require('../server/_core/d1Client');

async function main() {
  console.log('--- Checking Local SQLite ---');
  try {
    const local = getLocalDbClient();
    const res = await local.execute('SELECT id, studentContactId, title, meetingTargets, updatedAt FROM meeting_workspaces');
    console.log('Meeting workspaces in local DB:', res.rows.length);
    for (const row of res.rows) {
      console.log(`- ID: ${row.id}, StudentId: ${row.studentContactId}, Title: ${row.title}, UpdatedAt: ${row.updatedAt}`);
      if (row.meetingTargets) {
        try {
          const targets = JSON.parse(row.meetingTargets);
          console.log(`  Targets count: ${targets.length}`);
        } catch(e) {
          console.log('  Invalid JSON in meetingTargets');
        }
      }
    }

    const contacts = await local.execute("SELECT id, firstName, lastName, caseNumber FROM contacts WHERE caseNumber LIKE '%0029%' OR id = 120034 OR firstName LIKE '%Jeremiah%'");
    console.log('Contacts matching Jeremiah / 0029:', contacts.rows);
  } catch (err) {
    console.error('Local error:', err.message);
  }

  console.log('--- Checking Cloudflare D1 ---');
  try {
    const d1Res = await queryCloudflareD1('SELECT id, studentContactId, title, meetingTargets, updatedAt FROM meeting_workspaces');
    console.log('D1 workspaces count:', d1Res.length);
    for (const row of d1Res) {
      console.log(`- ID: ${row.id}, StudentId: ${row.studentContactId}, Title: ${row.title}, UpdatedAt: ${row.updatedAt}`);
      if (row.meetingTargets) {
        try {
          const targets = typeof row.meetingTargets === 'string' ? JSON.parse(row.meetingTargets) : row.meetingTargets;
          console.log(`  Targets count: ${Array.isArray(targets) ? targets.length : 0}`);
        } catch (e) {
          console.log('  Invalid JSON in meetingTargets');
        }
      }
    }

    const d1Contacts = await queryCloudflareD1("SELECT id, firstName, lastName, caseNumber FROM contacts WHERE caseNumber LIKE '%0029%' OR id = 120034 OR firstName LIKE '%Jeremiah%'");
    console.log('D1 Contacts matching Jeremiah / 0029:', d1Contacts);
  } catch (err) {
    console.error('D1 error:', err.message);
  }
}

main().catch(console.error);
