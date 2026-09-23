import { getLocalDbClient } from '../server/_core/d1Client';

async function sync() {
  try {
    const client = getLocalDbClient();
    await client.execute({ sql: `UPDATE contacts SET jobTitle = 'Student', schoolName = 'Maynard Holbrook Jackson High School', gradeLevel = '11th Grade', planType = 'IEP', accountStatus = 'Active', pipelineStage = 'Active' WHERE id = 120034`, args: [] });
    await client.execute({ sql: `DELETE FROM contacts WHERE id IN (120035, 120036) OR (firstName = 'Tiana' AND lastName = 'Test') OR (firstName = 'Shanderious' AND lastName = 'Test')`, args: [] });
    await client.execute({ sql: `INSERT INTO contacts (id, ownerId, firstName, lastName, email, phone, company, jobTitle, caseId, accountStatus, pipelineStage, createdAt, updatedAt) VALUES (120035, 1, 'Tiana', 'Test', 'tiana.test@example.com', '(404) 555-0199', 'Test Family', 'Parent', 'WP-2026-0030', 'Active', 'Active', datetime('now'), datetime('now'))`, args: [] });
    await client.execute({ sql: `INSERT INTO contacts (id, ownerId, firstName, lastName, company, jobTitle, caseId, parentContactId, schoolName, gradeLevel, planType, accountStatus, pipelineStage, createdAt, updatedAt) VALUES (120036, 1, 'Shanderious', 'Test', 'Test Family', 'Student', 'WP-2026-0030', 120035, 'Atlanta Public Schools', '10th Grade', 'IEP', 'Active', 'Active', datetime('now'), datetime('now'))`, args: [] });
    console.log('Local SQLite synced successfully!');
    const res = await client.execute({ sql: 'SELECT id, firstName, lastName, caseId, jobTitle FROM contacts WHERE id IN (120034, 120035, 120036)', args: [] });
    console.log('Updated rows in local.sqlite:', res.rows);
  } catch (e) {
    console.error('Error syncing local SQLite:', e);
  }
}

sync();
