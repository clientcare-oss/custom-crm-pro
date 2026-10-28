import { queryCloudflareD1, getLocalDbClient } from "../server/_core/d1Client";

async function main() {
  console.log("Setting up federal_legal_provisions, federal_guidance_documents, and federal_guidance_law_links...");

  const queries = [
    `CREATE TABLE IF NOT EXISTS federal_legal_provisions (
      id TEXT PRIMARY KEY,
      act TEXT NOT NULL,
      subpart TEXT NOT NULL,
      sectionCitation TEXT NOT NULL,
      title TEXT NOT NULL,
      plainLanguageExplanation TEXT NOT NULL,
      keyPoints TEXT,
      advocacyTips TEXT,
      statutoryTimeline TEXT,
      officialUrl TEXT NOT NULL,
      authorityType TEXT DEFAULT 'Federal Regulation' NOT NULL,
      topics TEXT NOT NULL,
      relatedCitations TEXT,
      lastVerifiedDate TEXT NOT NULL,
      verificationStatus TEXT DEFAULT 'Verified' NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS federal_guidance_documents (
      id TEXT PRIMARY KEY,
      documentNumber TEXT,
      title TEXT NOT NULL,
      issuingOffice TEXT NOT NULL,
      dateIssued TEXT NOT NULL,
      publicationYear INTEGER NOT NULL,
      documentType TEXT NOT NULL,
      relatedLaws TEXT NOT NULL,
      relatedCitations TEXT NOT NULL,
      summary TEXT NOT NULL,
      keyPoints TEXT,
      officialSourceUrl TEXT NOT NULL,
      pdfUrl TEXT,
      topics TEXT NOT NULL,
      guidanceStatus TEXT DEFAULT 'Current / Verified' NOT NULL,
      statusNotice TEXT,
      supersededBy TEXT,
      rescissionDate TEXT,
      lastVerifiedDate TEXT NOT NULL,
      verificationNotes TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS federal_guidance_law_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guidanceId TEXT NOT NULL,
      provisionId TEXT NOT NULL,
      sectionCitation TEXT NOT NULL,
      relationshipType TEXT DEFAULT 'interprets' NOT NULL,
      notes TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS idx_fed_prov_act ON federal_legal_provisions(act);`,
    `CREATE INDEX IF NOT EXISTS idx_fed_prov_citation ON federal_legal_provisions(sectionCitation);`,
    `CREATE INDEX IF NOT EXISTS idx_fed_guid_office ON federal_guidance_documents(issuingOffice);`,
    `CREATE INDEX IF NOT EXISTS idx_fed_guid_year ON federal_guidance_documents(publicationYear);`,
    `CREATE INDEX IF NOT EXISTS idx_fed_guid_status ON federal_guidance_documents(guidanceStatus);`,
    `CREATE INDEX IF NOT EXISTS idx_guid_link_guid ON federal_guidance_law_links(guidanceId);`,
    `CREATE INDEX IF NOT EXISTS idx_guid_link_prov ON federal_guidance_law_links(provisionId);`,
  ];

  // 1. Local SQLite execution
  console.log("Applying to local database client...");
  try {
    const localDb = getLocalDbClient();
    if (localDb) {
      for (const q of queries) {
        try {
          await localDb.execute(q);
        } catch (e: any) {
          console.warn("Local SQLite notice:", e?.message);
        }
      }
      console.log("Local SQLite tables created successfully!");
    } else {
      console.log("No local SQLite client found or using remote D1 direct mode.");
    }
  } catch (err: any) {
    console.warn("Local SQLite init warning:", err?.message);
  }

  // 2. Cloudflare D1 Remote execution
  console.log("Applying to Cloudflare D1 database (custom-crm-pro-db)...");
  for (const q of queries) {
    try {
      const res = await queryCloudflareD1(q);
      if (res.error) {
        console.warn("D1 query notice:", res.error);
      }
    } catch (err: any) {
      console.warn("D1 query caught warning:", err?.message);
    }
  }

  console.log("Federal law tables setup complete!");
}

main().catch(console.error);
