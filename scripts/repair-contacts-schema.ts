import { queryCloudflareD1, getLocalDbClient } from '../server/_core/d1Client';

async function repair() {
  console.log('--- Step 1: Repairing local.sqlite contacts columns ---');
  const local = getLocalDbClient();

  const localColumnsToAdd = [
    "ALTER TABLE contacts ADD COLUMN lawyerInvolved INTEGER DEFAULT 0",
    "ALTER TABLE contacts ADD COLUMN attorneyRepresents TEXT DEFAULT 'Parent/Student'",
    "ALTER TABLE contacts ADD COLUMN attorneyInvolvementDate TEXT",
    "ALTER TABLE contacts ADD COLUMN legalNotes TEXT",
    "ALTER TABLE contacts ADD COLUMN attorneyDocuments TEXT",
    "ALTER TABLE contacts ADD COLUMN legalStatusUpdatedAt TIMESTAMP",
    "ALTER TABLE contacts ADD COLUMN legalStatusUpdatedBy TEXT",
    "ALTER TABLE contacts ADD COLUMN referralCode TEXT",
  ];

  for (const sql of localColumnsToAdd) {
    try {
      await local.execute(sql);
      console.log('✓ Local SQLite added:', sql);
    } catch (e: any) {
      if (e.message.includes('duplicate column')) {
        console.log('- Local column already exists:', sql.split('ADD COLUMN ')[1]);
      } else {
        console.warn('Local alter warning:', e.message);
      }
    }
  }

  console.log('\n--- Step 2: Repairing Cloudflare D1 contacts columns ---');
  const d1ColumnsToAdd = [
    "ALTER TABLE contacts ADD COLUMN confirmedTimeZone TEXT",
    "ALTER TABLE contacts ADD COLUMN timeZoneSource TEXT DEFAULT 'Automatically detected'",
    "ALTER TABLE contacts ADD COLUMN timeZoneConfirmedAt TIMESTAMP",
    "ALTER TABLE contacts ADD COLUMN preferredCallingStartTime TEXT",
    "ALTER TABLE contacts ADD COLUMN preferredCallingEndTime TEXT",
    "ALTER TABLE contacts ADD COLUMN preferredCallingDays TEXT",
    "ALTER TABLE contacts ADD COLUMN mayCallOutsidePreferredHours INTEGER DEFAULT 0",
    "ALTER TABLE contacts ADD COLUMN preferredCommunicationMethod TEXT",
    "ALTER TABLE contacts ADD COLUMN latitude TEXT",
    "ALTER TABLE contacts ADD COLUMN longitude TEXT",
    "ALTER TABLE contacts ADD COLUMN locationAccuracy TEXT",
    "ALTER TABLE contacts ADD COLUMN locationLastUpdated TIMESTAMP",
    "ALTER TABLE contacts ADD COLUMN mapLatitude REAL",
    "ALTER TABLE contacts ADD COLUMN mapLongitude REAL",
    "ALTER TABLE contacts ADD COLUMN mapLocationAccuracy TEXT",
    "ALTER TABLE contacts ADD COLUMN mapLocationSource TEXT",
    "ALTER TABLE contacts ADD COLUMN mapLocationUpdatedAt TEXT",
    "ALTER TABLE contacts ADD COLUMN mapLocationStatus TEXT DEFAULT 'needs_geocoding'",
    "ALTER TABLE contacts ADD COLUMN isDemoData INTEGER DEFAULT 0",
  ];

  for (const sql of d1ColumnsToAdd) {
    try {
      await queryCloudflareD1(sql);
      console.log('✓ D1 added:', sql);
    } catch (e: any) {
      if (e.message.includes('duplicate column')) {
        console.log('- D1 column already exists:', sql.split('ADD COLUMN ')[1]);
      } else {
        console.warn('D1 alter warning:', e.message);
      }
    }
  }

  console.log('\n--- Step 3: Verify getContactsByOwner ---');
  const { getContactsByOwner } = await import('../server/db/contacts');
  const contacts = await getContactsByOwner(1);
  console.log(`Successfully recovered contacts: ${contacts.length}`);
  for (const c of contacts) {
    console.log(`[${c.id}] ${c.firstName} ${c.lastName} | title: ${c.jobTitle} | caseId: ${c.caseId}`);
  }
}

repair().catch(console.error);
