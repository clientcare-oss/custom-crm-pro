import { queryCloudflareD1 } from '../server/_core/d1Client.js';
import bcrypt from 'bcryptjs';

async function setupAccounts() {
  console.log('Setting up Admin & Client Portal accounts on Cloudflare D1...');

  // 1. Setup Admin Account for katkins@veritastech.io
  const adminOpenId = 'katkins-admin-openid';
  const adminEmail = 'katkins@veritastech.io';
  const adminName = 'Kyle Atkins';

  // Check if admin user already exists
  const existingAdmin = await queryCloudflareD1('SELECT * FROM users WHERE openId = ? OR email = ?', [adminOpenId, adminEmail]);
  if (existingAdmin.results.length === 0) {
    console.log('Inserting Admin account for katkins@veritastech.io...');
    await queryCloudflareD1(
      `INSERT INTO users (openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn)
       VALUES (?, ?, ?, 'dev', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [adminOpenId, adminName, adminEmail]
    );
  } else {
    console.log('Admin account for katkins@veritastech.io already exists.');
    await queryCloudflareD1(
      `UPDATE users SET role = 'admin', name = ? WHERE email = ?`,
      [adminName, adminEmail]
    );
  }

  // 2. Setup Demo Client Contact & Credentials for Client Portal testing
  const clientEmail = 'client@example.com';
  const clientPassword = 'Password123!';
  const passwordHash = await bcrypt.hash(clientPassword, 10);

  // Check if contact exists
  let contactId;
  const existingContact = await queryCloudflareD1('SELECT id FROM contacts WHERE email = ?', [clientEmail]);
  if (existingContact.results.length === 0) {
    console.log('Inserting Demo Client contact...');
    const insertRes = await queryCloudflareD1(
      `INSERT INTO contacts (ownerId, firstName, lastName, email, company, jobTitle, createdAt, updatedAt)
       VALUES (1, 'Demo', 'Client', ?, 'Acme Corp', 'Parent / Client', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [clientEmail]
    );
    contactId = insertRes.meta.last_row_id;
  } else {
    contactId = existingContact.results[0].id;
  }

  // Insert or update client credentials
  const existingCreds = await queryCloudflareD1('SELECT id FROM client_credentials WHERE contact_id = ?', [contactId]);
  if (existingCreds.results.length === 0) {
    console.log('Inserting Client Portal credentials for client@example.com...');
    await queryCloudflareD1(
      `INSERT INTO client_credentials (contact_id, email, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [contactId, clientEmail, passwordHash]
    );
  } else {
    console.log('Updating Client Portal password for client@example.com...');
    await queryCloudflareD1(
      `UPDATE client_credentials SET password_hash = ? WHERE contact_id = ?`,
      [passwordHash, contactId]
    );
  }

  console.log('\n==================================================');
  console.log('ACCOUNTS CREATED ON CLOUDFLARE D1:');
  console.log('1. YOUR ADMIN ACCOUNT:');
  console.log(`   - Name: ${adminName}`);
  console.log(`   - Email: ${adminEmail}`);
  console.log(`   - OpenID: ${adminOpenId}`);
  console.log('2. CLIENT PORTAL DEMO ACCOUNT:');
  console.log(`   - Portal URL: http://localhost:3000/portal`);
  console.log(`   - Email: ${clientEmail}`);
  console.log(`   - Password: ${clientPassword}`);
  console.log('==================================================\n');
}

setupAccounts().catch(err => {
  console.error('Account setup failed:', err);
  process.exit(1);
});
