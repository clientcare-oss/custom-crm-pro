import "dotenv/config";
import { queryCloudflareD1 } from "../server/_core/d1Client";

async function runMigration() {
  console.log("=== Starting PG-035 Services Catalog Migration & Deduplication ===");

  // 1. Safety Backup
  console.log("Step 1: Creating safety backups...");
  try {
    await queryCloudflareD1(`CREATE TABLE IF NOT EXISTS services_backup_pg035 AS SELECT * FROM services;`);
    await queryCloudflareD1(`CREATE TABLE IF NOT EXISTS serviceFolders_backup_pg035 AS SELECT * FROM serviceFolders;`);
    console.log("✓ Backup tables verified: services_backup_pg035, serviceFolders_backup_pg035");
  } catch (err: any) {
    console.error("Backup creation warning (tables may already exist):", err.message);
  }

  // 2. Inspect existing columns and add missing columns to serviceFolders
  console.log("Step 2: Checking columns for serviceFolders...");
  const folderInfo: any[] = await queryCloudflareD1(`PRAGMA table_info(serviceFolders);`);
  const folderCols = new Set(folderInfo.map((c) => c.name));

  const newFolderCols = [
    { name: "organizationId", type: "INTEGER NOT NULL DEFAULT 1" },
    { name: "slug", type: "TEXT NOT NULL DEFAULT ''" },
    { name: "description", type: "TEXT" },
    { name: "icon", type: "TEXT NOT NULL DEFAULT 'folder'" },
    { name: "color", type: "TEXT NOT NULL DEFAULT 'blue'" },
    { name: "sortOrder", type: "INTEGER NOT NULL DEFAULT 0" },
    { name: "isActive", type: "INTEGER NOT NULL DEFAULT 1" },
    { name: "isArchived", type: "INTEGER NOT NULL DEFAULT 0" },
    { name: "createdBy", type: "TEXT NOT NULL DEFAULT 'System'" },
    { name: "updatedBy", type: "TEXT" },
  ];

  for (const col of newFolderCols) {
    if (!folderCols.has(col.name)) {
      console.log(`Adding column ${col.name} to serviceFolders...`);
      await queryCloudflareD1(`ALTER TABLE serviceFolders ADD COLUMN ${col.name} ${col.type};`);
    }
  }

  // 3. Inspect existing columns and add missing columns to services
  console.log("Step 3: Checking columns for services...");
  const serviceInfo: any[] = await queryCloudflareD1(`PRAGMA table_info(services);`);
  const serviceCols = new Set(serviceInfo.map((c) => c.name));

  const newServiceCols = [
    { name: "organizationId", type: "INTEGER NOT NULL DEFAULT 1" },
    { name: "serviceCode", type: "TEXT NOT NULL DEFAULT ''" },
    { name: "internalName", type: "TEXT NOT NULL DEFAULT ''" },
    { name: "clientFacingTitle", type: "TEXT NOT NULL DEFAULT ''" },
    { name: "shortDescription", type: "TEXT" },
    { name: "fullDescription", type: "TEXT" },
    { name: "internalInstructions", type: "TEXT" },
    { name: "sortOrder", type: "INTEGER NOT NULL DEFAULT 0" },
    { name: "icon", type: "TEXT NOT NULL DEFAULT 'briefcase'" },
    { name: "accentColor", type: "TEXT NOT NULL DEFAULT 'blue'" },
    { name: "standardPrice", type: "INTEGER NOT NULL DEFAULT 0" },
    { name: "currency", type: "TEXT NOT NULL DEFAULT 'usd'" },
    { name: "billingType", type: "TEXT NOT NULL DEFAULT 'one_time'" },
    { name: "billingInterval", type: "TEXT" },
    { name: "customPriceAllowed", type: "INTEGER NOT NULL DEFAULT 1" },
    { name: "sessionDurationMinutes", type: "INTEGER" },
    { name: "deliveryTimeValue", type: "INTEGER" },
    { name: "deliveryTimeUnit", type: "TEXT NOT NULL DEFAULT 'business_days'" },
    { name: "deliveryTimeLabel", type: "TEXT NOT NULL DEFAULT '3 business days'" },
    { name: "isActive", type: "INTEGER NOT NULL DEFAULT 1" },
    { name: "isArchived", type: "INTEGER NOT NULL DEFAULT 0" },
    { name: "availableInDiscoveryCall", type: "INTEGER NOT NULL DEFAULT 1" },
    { name: "availableInParentPortal", type: "INTEGER NOT NULL DEFAULT 1" },
    { name: "availableInSupportOfferPanel", type: "INTEGER NOT NULL DEFAULT 1" },
    { name: "availableAsStandalone", type: "INTEGER NOT NULL DEFAULT 1" },
    { name: "availableAsAddOn", type: "INTEGER NOT NULL DEFAULT 1" },
    { name: "visibleToEmployees", type: "INTEGER NOT NULL DEFAULT 1" },
    { name: "planEligibility", type: "TEXT" },
    { name: "includedItems", type: "TEXT" },
    { name: "allowDocumentUpload", type: "INTEGER NOT NULL DEFAULT 1" },
    { name: "requireDocumentUpload", type: "INTEGER NOT NULL DEFAULT 0" },
    { name: "requireQuestionnaire", type: "INTEGER NOT NULL DEFAULT 0" },
    { name: "requireAgreement", type: "INTEGER NOT NULL DEFAULT 0" },
    { name: "requirePayment", type: "INTEGER NOT NULL DEFAULT 1" },
    { name: "smartFileTemplateId", type: "INTEGER" },
    { name: "workflowTemplateId", type: "INTEGER" },
    { name: "taskTemplateId", type: "INTEGER" },
    { name: "priorityEnabled", type: "INTEGER NOT NULL DEFAULT 0" },
    { name: "priorityPrice", type: "INTEGER" },
    { name: "priorityDeliveryTimeValue", type: "INTEGER" },
    { name: "priorityDeliveryTimeUnit", type: "TEXT" },
    { name: "priorityDeliveryTimeLabel", type: "TEXT" },
    { name: "priorityDescription", type: "TEXT" },
    { name: "stripeProductId", type: "TEXT" },
    { name: "stripePriceId", type: "TEXT" },
    { name: "stripeRecurringPriceId", type: "TEXT" },
    { name: "stripePriorityPriceId", type: "TEXT" },
    { name: "stripeSyncStatus", type: "TEXT NOT NULL DEFAULT 'not_connected'" },
    { name: "stripeSyncedAt", type: "DATETIME" },
    { name: "createdBy", type: "TEXT NOT NULL DEFAULT 'System'" },
    { name: "updatedBy", type: "TEXT" },
  ];

  for (const col of newServiceCols) {
    if (!serviceCols.has(col.name)) {
      console.log(`Adding column ${col.name} to services...`);
      await queryCloudflareD1(`ALTER TABLE services ADD COLUMN ${col.name} ${col.type};`);
    }
  }

  // 4. Create service_catalog_events table if not exists
  console.log("Step 4: Ensuring service_catalog_events table exists...");
  await queryCloudflareD1(`
    CREATE TABLE IF NOT EXISTS service_catalog_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organizationId INTEGER NOT NULL DEFAULT 1,
      serviceId INTEGER,
      folderId INTEGER,
      eventType TEXT NOT NULL,
      actor TEXT NOT NULL,
      previousValues TEXT,
      newValues TEXT,
      timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("✓ service_catalog_events table ready");

  // 5. Repoint references from duplicate services/folders
  console.log("Step 5: Repointing references from duplicate IDs...");
  try {
    // Check if clientSupportOffers exists
    const tables: any[] = await queryCloudflareD1(`SELECT name FROM sqlite_master WHERE type='table' AND name='clientSupportOffers';`);
    if (tables.length > 0) {
      await queryCloudflareD1(`
        UPDATE clientSupportOffers 
        SET sourceServiceId = sourceServiceId - 9 
        WHERE sourceServiceId BETWEEN 10 AND 18;
      `);
      console.log("✓ Repointed clientSupportOffers references from duplicates (10..18) to canonical (1..9)");
    }
  } catch (err: any) {
    console.warn("Notice updating clientSupportOffers:", err.message);
  }

  // Repoint services referencing folders 5..8 to 1..4
  await queryCloudflareD1(`
    UPDATE services 
    SET folderId = folderId - 4 
    WHERE folderId BETWEEN 5 AND 8;
  `);
  console.log("✓ Repointed folderId references from duplicates (5..8) to canonical (1..4)");

  // 6. Archive duplicate folders and duplicate services
  console.log("Step 6: Archiving duplicate folders and services...");
  await queryCloudflareD1(`
    UPDATE serviceFolders 
    SET isArchived = 1, isActive = 0 
    WHERE id IN (5, 6, 7, 8);
  `);
  await queryCloudflareD1(`
    UPDATE services 
    SET isArchived = 1, isActive = 0 
    WHERE id IN (10, 11, 12, 13, 14, 15, 16, 17, 18);
  `);
  console.log("✓ Marked duplicate folders (5..8) and duplicate services (10..18) as archived");

  // 7. Update canonical folders (1..4) with rich metadata
  console.log("Step 7: Updating canonical folders (1..4)...");
  await queryCloudflareD1(`
    UPDATE serviceFolders 
    SET slug = 'memberships', icon = 'shield-check', color = 'blue', sortOrder = 1, isActive = 1, isArchived = 0, organizationId = 1
    WHERE id = 1;
  `);
  await queryCloudflareD1(`
    UPDATE serviceFolders 
    SET slug = 'state_complaints', icon = 'scale', color = 'purple', sortOrder = 2, isActive = 1, isArchived = 0, organizationId = 1
    WHERE id = 2;
  `);
  await queryCloudflareD1(`
    UPDATE serviceFolders 
    SET slug = 'representation', icon = 'briefcase', color = 'indigo', sortOrder = 3, isActive = 1, isArchived = 0, organizationId = 1
    WHERE id = 3;
  `);
  await queryCloudflareD1(`
    UPDATE serviceFolders 
    SET slug = 'audits_sessions', icon = 'file-text', color = 'teal', sortOrder = 4, isActive = 1, isArchived = 0, organizationId = 1
    WHERE id = 4;
  `);

  // Seed additional standard folders if they don't exist
  const additionalFolders = [
    { name: "Meeting Support", slug: "meeting_support", icon: "users", color: "blue", sortOrder: 5 },
    { name: "Strategy Sessions", slug: "strategy_sessions", icon: "lightbulb", color: "yellow", sortOrder: 6 },
    { name: "Behavior Support", slug: "behavior_support", icon: "heart-handshake", color: "rose", sortOrder: 7 },
    { name: "Discipline & Safety", slug: "discipline_safety", icon: "alert-triangle", color: "red", sortOrder: 8 },
    { name: "Transition Support", slug: "transition_support", icon: "compass", color: "cyan", sortOrder: 9 },
    { name: "Other Services", slug: "other_services", icon: "more-horizontal", color: "gray", sortOrder: 10 },
  ];

  for (const folder of additionalFolders) {
    const existing: any[] = await queryCloudflareD1(
      `SELECT id FROM serviceFolders WHERE organizationId = 1 AND slug = ?;`,
      [folder.slug]
    );
    if (existing.length === 0) {
      await queryCloudflareD1(
        `INSERT INTO serviceFolders (organizationId, ownerId, name, slug, icon, color, sortOrder, isActive, isArchived, createdBy)
         VALUES (1, 1, ?, ?, ?, ?, ?, 1, 0, 'System');`,
        [folder.name, folder.slug, folder.icon, folder.color, folder.sortOrder]
      );
      console.log(`✓ Seeded folder: ${folder.name} (${folder.slug})`);
    }
  }

  // Fetch updated folder IDs
  const allFolders: any[] = await queryCloudflareD1(
    `SELECT id, slug, name FROM serviceFolders WHERE organizationId = 1 AND isArchived = 0;`
  );
  const folderMap = new Map<string, number>();
  for (const f of allFolders) {
    folderMap.set(f.slug, f.id);
  }

  // 8. Update Canonical Services (1..9) with exact stable serviceCodes and standard pricing
  console.log("Step 8: Updating canonical services (1..9)...");

  // Service 1: advocacy_plan_55
  await queryCloudflareD1(`
    UPDATE services SET
      organizationId = 1,
      serviceCode = 'advocacy_plan_55',
      internalName = 'Advocacy Only',
      clientFacingTitle = 'Advocacy Only',
      name = 'Advocacy Only',
      shortDescription = 'Ongoing advocacy and unlimited virtual meeting support.',
      fullDescription = 'Continuous Master IEP Coach support providing unlimited virtual attendance at IEP, 504, and evaluation meetings, plus Parent Portal case messaging and documentation prep.',
      internalInstructions = 'Assigned lead coach attends scheduled district sessions virtually. Track prep time in Case Compass.',
      standardPrice = 5500,
      price = 5500,
      currency = 'usd',
      billingType = 'recurring',
      billingInterval = 'monthly',
      folderId = 1,
      icon = 'users',
      accentColor = 'blue',
      sortOrder = 1,
      isActive = 1,
      isArchived = 0,
      availableInDiscoveryCall = 1,
      availableInParentPortal = 1,
      availableInSupportOfferPanel = 1,
      availableAsStandalone = 1,
      availableAsAddOn = 0,
      deliveryTimeValue = 1,
      deliveryTimeUnit = 'calendar_days',
      deliveryTimeLabel = 'Ongoing monthly',
      planEligibility = '{"plan_55":"included","plan_105":"unavailable","scholarship":"unavailable","pay_per_use":"unavailable","standalone":"unavailable"}',
      includedItems = '[{"id":"item-1","text":"Dedicated Master IEP Coach guidance","sortOrder":1,"isActive":true},{"id":"item-2","text":"Unlimited virtual meeting attendance (IEP, 504, eligibility)","sortOrder":2,"isActive":true},{"id":"item-3","text":"Parent Portal communications and strategy support","sortOrder":3,"isActive":true}]'
    WHERE id = 1;
  `);

  // Service 2: advocacy_plan_105
  await queryCloudflareD1(`
    UPDATE services SET
      organizationId = 1,
      serviceCode = 'advocacy_plan_105',
      internalName = 'Advocacy + State Complaints',
      clientFacingTitle = 'Advocacy + State Complaints',
      name = 'Advocacy + State Complaints',
      shortDescription = 'Ongoing advocacy, meeting support, email assistance, and state complaint help.',
      fullDescription = 'Comprehensive Master IEP Coach support covering full meeting attendance, priority school correspondence assistance, and state administrative complaint drafting and filing oversight.',
      internalInstructions = 'Full tier membership. Prioritize communications and schedule complaint drafting sessions promptly.',
      standardPrice = 10500,
      price = 10500,
      currency = 'usd',
      billingType = 'recurring',
      billingInterval = 'monthly',
      folderId = 1,
      icon = 'scale',
      accentColor = 'purple',
      sortOrder = 2,
      isActive = 1,
      isArchived = 0,
      availableInDiscoveryCall = 1,
      availableInParentPortal = 1,
      availableInSupportOfferPanel = 1,
      availableAsStandalone = 1,
      availableAsAddOn = 0,
      deliveryTimeValue = 1,
      deliveryTimeUnit = 'calendar_days',
      deliveryTimeLabel = 'Ongoing monthly',
      planEligibility = '{"plan_55":"unavailable","plan_105":"included","scholarship":"unavailable","pay_per_use":"unavailable","standalone":"unavailable"}',
      includedItems = '[{"id":"item-1","text":"All core IEP advocacy and virtual meeting support","sortOrder":1,"isActive":true},{"id":"item-2","text":"Priority email and school communication assistance","sortOrder":2,"isActive":true},{"id":"item-3","text":"State administrative complaint drafting and filing oversight","sortOrder":3,"isActive":true}]'
    WHERE id = 2;
  `);

  // Service 3: state_complaint_support ($200 one-time AUTHORITATIVE)
  await queryCloudflareD1(`
    UPDATE services SET
      organizationId = 1,
      serviceCode = 'state_complaint_support',
      internalName = 'State Complaint Support',
      clientFacingTitle = 'State Complaint Support',
      name = 'State Complaint Support',
      shortDescription = 'Preparation and drafting support for one state complaint.',
      fullDescription = 'Authoritative assistance and drafting for filing a Georgia Department of Education IDEA state administrative complaint with document review and evidence timeline preparation.',
      internalInstructions = 'Use PG-020 Georgia State Complaint Builder. Index all school violations and assemble evidence bundle.',
      standardPrice = 20000,
      price = 20000,
      currency = 'usd',
      billingType = 'one_time',
      billingInterval = NULL,
      folderId = 2,
      icon = 'file-text',
      accentColor = 'purple',
      sortOrder = 3,
      isActive = 1,
      isArchived = 0,
      availableInDiscoveryCall = 1,
      availableInParentPortal = 1,
      availableInSupportOfferPanel = 1,
      availableAsStandalone = 1,
      availableAsAddOn = 1,
      deliveryTimeValue = 5,
      deliveryTimeUnit = 'business_days',
      deliveryTimeLabel = '5 business days',
      allowDocumentUpload = 1,
      requireDocumentUpload = 1,
      requirePayment = 1,
      planEligibility = '{"plan_55":"available_as_addon","plan_105":"available_as_addon","scholarship":"available_as_addon","pay_per_use":"available_as_addon","standalone":"available_as_addon"}',
      includedItems = '[{"id":"item-1","text":"Review of relevant IEP, evaluation, and PWN records","sortOrder":1,"isActive":true},{"id":"item-2","text":"Identification of GaDOE systemic or student-specific IDEA violations","sortOrder":2,"isActive":true},{"id":"item-3","text":"Preparation and drafting of formal State Complaint document","sortOrder":3,"isActive":true},{"id":"item-4","text":"Filing submission guidance and evidence indexing","sortOrder":4,"isActive":true}]'
    WHERE id = 3;
  `);
  console.log("✓ Service 3 updated: state_complaint_support ($200 one-time)");

  // Service 4: iep_full_representation
  await queryCloudflareD1(`
    UPDATE services SET
      organizationId = 1,
      serviceCode = 'iep_full_representation',
      internalName = 'Full IEP Representation Package',
      clientFacingTitle = 'Full IEP Representation Package',
      name = 'Full IEP Representation Package',
      shortDescription = 'Comprehensive end-to-end representation through annual review and implementation.',
      fullDescription = 'Complete hands-on advocacy representation covering evaluation analysis, goal formulation, meeting advocacy, and implementation fidelity checks.',
      standardPrice = 185000,
      price = 185000,
      currency = 'usd',
      billingType = 'one_time',
      folderId = 3,
      icon = 'briefcase',
      accentColor = 'indigo',
      sortOrder = 4,
      isActive = 1,
      isArchived = 0,
      availableInDiscoveryCall = 1,
      availableInParentPortal = 1,
      availableInSupportOfferPanel = 1,
      availableAsStandalone = 1,
      availableAsAddOn = 1,
      deliveryTimeValue = 14,
      deliveryTimeUnit = 'business_days',
      deliveryTimeLabel = '14 business days',
      planEligibility = '{"plan_55":"available_as_addon","plan_105":"available_as_addon","scholarship":"available_as_addon","pay_per_use":"available_as_addon","standalone":"available_as_addon"}',
      includedItems = '[{"id":"item-1","text":"Complete cumulative file and evaluation audit","sortOrder":1,"isActive":true},{"id":"item-2","text":"Drafting comprehensive parent concerns statement","sortOrder":2,"isActive":true},{"id":"item-3","text":"Two formal virtual IEP team meeting appearances","sortOrder":3,"isActive":true},{"id":"item-4","text":"Prior Written Notice (PWN) response and compliance check","sortOrder":4,"isActive":true}]'
    WHERE id = 4;
  `);

  // Service 5: annual_advocacy_retainer
  await queryCloudflareD1(`
    UPDATE services SET
      organizationId = 1,
      serviceCode = 'annual_advocacy_retainer',
      internalName = 'Annual Comprehensive Advocacy Retainer',
      clientFacingTitle = 'Annual Comprehensive Advocacy Retainer',
      name = 'Annual Comprehensive Advocacy Retainer',
      shortDescription = 'Year-round dedicated IEP representation and dispute defense across school year.',
      fullDescription = 'Continuous executive-level advocacy covering all meetings, communications, progress monitoring, and dispute defense for 12 months.',
      standardPrice = 320000,
      price = 320000,
      currency = 'usd',
      billingType = 'recurring',
      billingInterval = 'yearly',
      folderId = 3,
      icon = 'award',
      accentColor = 'indigo',
      sortOrder = 5,
      isActive = 1,
      isArchived = 0,
      availableInDiscoveryCall = 1,
      availableInParentPortal = 1,
      availableInSupportOfferPanel = 1,
      availableAsStandalone = 1,
      availableAsAddOn = 1,
      deliveryTimeValue = 365,
      deliveryTimeUnit = 'calendar_days',
      deliveryTimeLabel = '1 Full Year',
      planEligibility = '{"plan_55":"available_as_addon","plan_105":"available_as_addon","scholarship":"available_as_addon","pay_per_use":"available_as_addon","standalone":"available_as_addon"}',
      includedItems = '[{"id":"item-1","text":"Dedicated primary IEP advocate on retainer","sortOrder":1,"isActive":true},{"id":"item-2","text":"All IEP, 504, MDR, and transition team meetings","sortOrder":2,"isActive":true},{"id":"item-3","text":"Continuous quarterly IEP progress report reviews","sortOrder":3,"isActive":true},{"id":"item-4","text":"State complaint drafting and filing oversight included","sortOrder":4,"isActive":true}]'
    WHERE id = 5;
  `);

  // Service 6: advocacy_hourly_retainer_15h
  await queryCloudflareD1(`
    UPDATE services SET
      organizationId = 1,
      serviceCode = 'advocacy_hourly_retainer_15h',
      internalName = '15-Hour Dedicated Advocacy Block',
      clientFacingTitle = '15-Hour Dedicated Advocacy Block',
      name = '15-Hour Dedicated Advocacy Block',
      shortDescription = 'Flexible 15-hour representation retainer for meetings, document analysis, and dispute support.',
      fullDescription = 'A 15-hour prepaid block of expert advocacy support. Hours can be utilized for meeting prep, direct meeting attendance, document audits, and district communications.',
      standardPrice = 195000,
      price = 195000,
      currency = 'usd',
      billingType = 'one_time',
      folderId = 3,
      icon = 'clock',
      accentColor = 'indigo',
      sortOrder = 6,
      isActive = 1,
      isArchived = 0,
      availableInDiscoveryCall = 1,
      availableInParentPortal = 1,
      availableInSupportOfferPanel = 1,
      availableAsStandalone = 1,
      availableAsAddOn = 1,
      deliveryTimeValue = 15,
      deliveryTimeUnit = 'hours',
      deliveryTimeLabel = '15 billable hours',
      planEligibility = '{"plan_55":"available_as_addon","plan_105":"available_as_addon","scholarship":"available_as_addon","pay_per_use":"available_as_addon","standalone":"available_as_addon"}',
      includedItems = '[{"id":"item-1","text":"15 dedicated advocacy hours with itemized log","sortOrder":1,"isActive":true},{"id":"item-2","text":"Rollover within active school year","sortOrder":2,"isActive":true}]'
    WHERE id = 6;
  `);

  // Service 7: iep_document_review
  await queryCloudflareD1(`
    UPDATE services SET
      organizationId = 1,
      serviceCode = 'iep_document_review',
      internalName = 'IEP Comprehensive Document Audit',
      clientFacingTitle = 'IEP Comprehensive Document Audit',
      name = 'IEP Comprehensive Document Audit',
      shortDescription = 'Forensic audit of present levels, SMART goals, accommodations, and procedural compliance.',
      fullDescription = 'Thorough diagnostic analysis of your child’s existing IEP, past evaluations, and progress notes. Receive an itemized report of deficiencies, red flags, and recommended goal amendments.',
      standardPrice = 75000,
      price = 75000,
      currency = 'usd',
      billingType = 'one_time',
      folderId = 4,
      icon = 'file-search',
      accentColor = 'teal',
      sortOrder = 7,
      isActive = 1,
      isArchived = 0,
      availableInDiscoveryCall = 1,
      availableInParentPortal = 1,
      availableInSupportOfferPanel = 1,
      availableAsStandalone = 1,
      availableAsAddOn = 1,
      deliveryTimeValue = 3,
      deliveryTimeUnit = 'business_days',
      deliveryTimeLabel = '3 business days',
      allowDocumentUpload = 1,
      requireDocumentUpload = 1,
      requirePayment = 1,
      planEligibility = '{"plan_55":"available_as_addon","plan_105":"available_as_addon","scholarship":"available_as_addon","pay_per_use":"available_as_addon","standalone":"available_as_addon"}',
      includedItems = '[{"id":"item-1","text":"Line-by-line analysis of current IEP and psychological evaluations","sortOrder":1,"isActive":true},{"id":"item-2","text":"Itemized SMART goal revision recommendations","sortOrder":2,"isActive":true},{"id":"item-3","text":"Accommodations and modifications strengthening checklist","sortOrder":3,"isActive":true},{"id":"item-4","text":"30-minute advocate debrief video call","sortOrder":4,"isActive":true}]'
    WHERE id = 7;
  `);

  // Service 8: iee_oversight_defense
  await queryCloudflareD1(`
    UPDATE services SET
      organizationId = 1,
      serviceCode = 'iee_oversight_defense',
      internalName = 'Independent Educational Evaluation (IEE) Defense',
      clientFacingTitle = 'Independent Educational Evaluation (IEE) Defense',
      name = 'Independent Educational Evaluation (IEE) Defense',
      shortDescription = 'Strategic framing and formal request for publicly funded independent evaluations.',
      fullDescription = 'Assistance asserting your parental right under IDEA to an Independent Educational Evaluation at public expense when in disagreement with district testing.',
      standardPrice = 45000,
      price = 45000,
      currency = 'usd',
      billingType = 'one_time',
      folderId = 4,
      icon = 'shield-alert',
      accentColor = 'teal',
      sortOrder = 8,
      isActive = 1,
      isArchived = 0,
      availableInDiscoveryCall = 1,
      availableInParentPortal = 1,
      availableInSupportOfferPanel = 1,
      availableAsStandalone = 1,
      availableAsAddOn = 1,
      deliveryTimeValue = 2,
      deliveryTimeUnit = 'business_days',
      deliveryTimeLabel = '2 business days',
      allowDocumentUpload = 1,
      requireDocumentUpload = 1,
      planEligibility = '{"plan_55":"available_as_addon","plan_105":"available_as_addon","scholarship":"available_as_addon","pay_per_use":"available_as_addon","standalone":"available_as_addon"}',
      includedItems = '[{"id":"item-1","text":"Review of district evaluation discrepancies and omissions","sortOrder":1,"isActive":true},{"id":"item-2","text":"Formal IEE demand letter customized with statutory citations","sortOrder":2,"isActive":true},{"id":"item-3","text":"Criteria guidance and vetted independent evaluator selection","sortOrder":3,"isActive":true}]'
    WHERE id = 8;
  `);

  // Service 9: bip_fba_audit
  await queryCloudflareD1(`
    UPDATE services SET
      organizationId = 1,
      serviceCode = 'bip_fba_audit',
      internalName = 'BIP & Functional Behavior Assessment Audit',
      clientFacingTitle = 'BIP & Functional Behavior Assessment Audit',
      name = 'BIP & Functional Behavior Assessment Audit',
      shortDescription = 'In-depth review of behavioral tracking data, intervention plans, and positive support strategies.',
      fullDescription = 'Detailed analysis of student Functional Behavior Assessments (FBA) and Behavior Intervention Plans (BIP) to ensure proactive, trauma-informed, positive behavioral supports.',
      standardPrice = 35000,
      price = 35000,
      currency = 'usd',
      billingType = 'one_time',
      folderId = 4,
      icon = 'heart-pulse',
      accentColor = 'teal',
      sortOrder = 9,
      isActive = 1,
      isArchived = 0,
      availableInDiscoveryCall = 1,
      availableInParentPortal = 1,
      availableInSupportOfferPanel = 1,
      availableAsStandalone = 1,
      availableAsAddOn = 1,
      deliveryTimeValue = 3,
      deliveryTimeUnit = 'business_days',
      deliveryTimeLabel = '3 business days',
      allowDocumentUpload = 1,
      requireDocumentUpload = 1,
      planEligibility = '{"plan_55":"available_as_addon","plan_105":"available_as_addon","scholarship":"available_as_addon","pay_per_use":"available_as_addon","standalone":"available_as_addon"}',
      includedItems = '[{"id":"item-1","text":"Evaluation of antecedent, behavior, and consequence (ABC) data","sortOrder":1,"isActive":true},{"id":"item-2","text":"Analysis of replacement behaviors and reinforcement efficacy","sortOrder":2,"isActive":true},{"id":"item-3","text":"Crisis de-escalation protocol audit","sortOrder":3,"isActive":true}]'
    WHERE id = 9;
  `);

  // 9. Seed the remaining standard Waypoint services (idempotent upsert by organizationId + serviceCode)
  console.log("Step 9: Seeding remaining standard Waypoint services...");
  const standardServices = [
    {
      serviceCode: "iep_meeting_preparation",
      internalName: "IEP Meeting Preparation & Strategy",
      clientFacingTitle: "IEP Meeting Preparation & Strategy",
      shortDescription: "Strategic agenda preparation, accommodation targets, and script for upcoming meeting.",
      fullDescription: "A comprehensive pre-meeting strategy intensive. We analyze past performance data, synthesize parent priority items into an actionable agenda, and prepare talking points.",
      standardPrice: 35000,
      billingType: "one_time",
      folderSlug: "meeting_support",
      icon: "calendar-check",
      accentColor: "blue",
      sortOrder: 10,
      deliveryTimeValue: 3,
      deliveryTimeUnit: "business_days",
      deliveryTimeLabel: "3 business days",
      allowDocumentUpload: 1,
      requireDocumentUpload: 1,
      includedItems: JSON.stringify([
        { id: "item-1", text: "Custom Meeting Strategy Agenda with parent priority items", sortOrder: 1, isActive: true },
        { id: "item-2", text: "Targeted SMART accommodations proposal list", sortOrder: 2, isActive: true },
        { id: "item-3", text: "45-minute live advocate coaching prep session", sortOrder: 3, isActive: true },
      ]),
      planEligibility: JSON.stringify({
        plan_55: "available_as_addon",
        plan_105: "available_as_addon",
        scholarship: "available_as_addon",
        pay_per_use: "available_as_addon",
        standalone: "available_as_addon",
      }),
    },
    {
      serviceCode: "parent_concern_statement",
      internalName: "Parent Concern Statement Drafting",
      clientFacingTitle: "Parent Concern Statement Drafting",
      shortDescription: "Professional drafting of official Parent Concerns for inclusion into Section 1 of the IEP.",
      fullDescription: "Under IDEA regulations, the IEP team must consider the concerns of the parents. We draft a legally framed, child-centered statement that must be incorporated verbatim into the student's IEP document.",
      standardPrice: 25000,
      billingType: "one_time",
      folderSlug: "audits_sessions",
      icon: "pen-tool",
      accentColor: "teal",
      sortOrder: 11,
      deliveryTimeValue: 2,
      deliveryTimeUnit: "business_days",
      deliveryTimeLabel: "2 business days",
      allowDocumentUpload: 1,
      requireDocumentUpload: 0,
      includedItems: JSON.stringify([
        { id: "item-1", text: "Detailed parent intake and student profile analysis", sortOrder: 1, isActive: true },
        { id: "item-2", text: "Formal written Parent Concerns statement with statutory references", sortOrder: 2, isActive: true },
        { id: "item-3", text: "Email transmittal template for school district submission", sortOrder: 3, isActive: true },
      ]),
      planEligibility: JSON.stringify({
        plan_55: "available_as_addon",
        plan_105: "available_as_addon",
        scholarship: "available_as_addon",
        pay_per_use: "available_as_addon",
        standalone: "available_as_addon",
      }),
    },
    {
      serviceCode: "school_communication_support",
      internalName: "School Communication & Email Support",
      clientFacingTitle: "School Communication & Email Support",
      shortDescription: "Fast advocate drafting of high-stakes district correspondence, records requests, or PWN demands.",
      fullDescription: "Expert assistance formulating clear, calm, and legally sound email communications to school administrators, special education directors, or case managers.",
      standardPrice: 20000,
      billingType: "one_time",
      folderSlug: "audits_sessions",
      icon: "mail",
      accentColor: "teal",
      sortOrder: 12,
      deliveryTimeValue: 24,
      deliveryTimeUnit: "hours",
      deliveryTimeLabel: "24 hours",
      allowDocumentUpload: 1,
      requireDocumentUpload: 0,
      includedItems: JSON.stringify([
        { id: "item-1", text: "Drafting of up to two formal district letters or responses", sortOrder: 1, isActive: true },
        { id: "item-2", text: "FERPA educational records inspection request framing", sortOrder: 2, isActive: true },
      ]),
      planEligibility: JSON.stringify({
        plan_55: "available_as_addon",
        plan_105: "included",
        scholarship: "available_as_addon",
        pay_per_use: "available_as_addon",
        standalone: "available_as_addon",
      }),
    },
    {
      serviceCode: "advocate_meeting_attendance",
      internalName: "Virtual IEP Meeting Attendance (2 Hours)",
      clientFacingTitle: "Virtual IEP Meeting Attendance (2 Hours)",
      shortDescription: "Live advocate presence, note-taking, and strategic advocacy during virtual district meeting.",
      fullDescription: "An experienced Master IEP Coach joins your virtual IEP, 504, or manifestation determination meeting to ensure procedural compliance, active parent voice, and appropriate accommodations.",
      standardPrice: 50000,
      billingType: "one_time",
      folderSlug: "meeting_support",
      icon: "video",
      accentColor: "blue",
      sortOrder: 13,
      deliveryTimeValue: 2,
      deliveryTimeUnit: "hours",
      deliveryTimeLabel: "2-hour meeting block",
      allowDocumentUpload: 1,
      requireDocumentUpload: 1,
      includedItems: JSON.stringify([
        { id: "item-1", text: "Up to 2 hours of direct virtual meeting advocacy", sortOrder: 1, isActive: true },
        { id: "item-2", text: "Real-time parent sidebar messaging and prompt cards", sortOrder: 2, isActive: true },
        { id: "item-3", text: "Post-meeting summary and next-steps action items", sortOrder: 3, isActive: true },
      ]),
      planEligibility: JSON.stringify({
        plan_55: "included",
        plan_105: "included",
        scholarship: "included",
        pay_per_use: "available_as_addon",
        standalone: "available_as_addon",
      }),
    },
    {
      serviceCode: "discipline_emergency_review",
      internalName: "MDR & Emergency Discipline Defense",
      clientFacingTitle: "MDR & Emergency Discipline Defense",
      shortDescription: "Immediate emergency defense for Manifestation Determination Reviews, suspensions, or expulsions.",
      fullDescription: "Rapid response assistance for students facing 10+ days of disciplinary removal. We evaluate whether the conduct was caused by or had a direct and substantial relationship to the disability.",
      standardPrice: 60000,
      billingType: "one_time",
      folderSlug: "discipline_safety",
      icon: "alert-octagon",
      accentColor: "red",
      sortOrder: 14,
      deliveryTimeValue: 24,
      deliveryTimeUnit: "hours",
      deliveryTimeLabel: "24-hour expedited",
      priorityEnabled: 1,
      priorityPrice: 20000,
      priorityDeliveryTimeLabel: "Same-day 6 hours",
      allowDocumentUpload: 1,
      requireDocumentUpload: 1,
      includedItems: JSON.stringify([
        { id: "item-1", text: "Expedited discipline notice & BIP implementation audit", sortOrder: 1, isActive: true },
        { id: "item-2", text: "Causation analysis & evidence compilation for MDR team", sortOrder: 2, isActive: true },
        { id: "item-3", text: "Direct virtual representation at Manifestation Determination Review", sortOrder: 3, isActive: true },
      ]),
      planEligibility: JSON.stringify({
        plan_55: "available_as_addon",
        plan_105: "available_as_addon",
        scholarship: "available_as_addon",
        pay_per_use: "available_as_addon",
        standalone: "available_as_addon",
      }),
    },
    {
      serviceCode: "transition_plan_review",
      internalName: "High School Transition & Vocational Audit",
      clientFacingTitle: "High School Transition & Vocational Audit",
      shortDescription: "Comprehensive review of post-secondary goals, transition services, and diploma pathways.",
      fullDescription: "Ensures students aged 14+ have appropriate measurable post-secondary goals in education, training, employment, and independent living, coordinated with Georgia vocational rehabilitation.",
      standardPrice: 45000,
      billingType: "one_time",
      folderSlug: "transition_support",
      icon: "compass",
      accentColor: "cyan",
      sortOrder: 15,
      deliveryTimeValue: 5,
      deliveryTimeUnit: "business_days",
      deliveryTimeLabel: "5 business days",
      allowDocumentUpload: 1,
      requireDocumentUpload: 1,
      includedItems: JSON.stringify([
        { id: "item-1", text: "Review of age-appropriate transition assessments", sortOrder: 1, isActive: true },
        { id: "item-2", text: "Post-secondary goal alignment with Georgia diploma tracks", sortOrder: 2, isActive: true },
        { id: "item-3", text: "Vocational rehabilitation and agency link audit", sortOrder: 3, isActive: true },
      ]),
      planEligibility: JSON.stringify({
        plan_55: "available_as_addon",
        plan_105: "available_as_addon",
        scholarship: "available_as_addon",
        pay_per_use: "available_as_addon",
        standalone: "available_as_addon",
      }),
    },
    {
      serviceCode: "pwn_review",
      internalName: "Prior Written Notice (PWN) Analysis & Response",
      clientFacingTitle: "Prior Written Notice (PWN) Analysis & Response",
      shortDescription: "Forensic analysis of district denial notices and formal parent written response formulation.",
      fullDescription: "When a school district refuses an evaluation, placement, or service, IDEA mandates a compliant Prior Written Notice explaining why. We dissect the notice and formulate a formal rebuttal.",
      standardPrice: 30000,
      billingType: "one_time",
      folderSlug: "audits_sessions",
      icon: "file-check",
      accentColor: "teal",
      sortOrder: 16,
      deliveryTimeValue: 3,
      deliveryTimeUnit: "business_days",
      deliveryTimeLabel: "3 business days",
      allowDocumentUpload: 1,
      requireDocumentUpload: 1,
      includedItems: JSON.stringify([
        { id: "item-1", text: "Review of district PWN procedural sufficiency", sortOrder: 1, isActive: true },
        { id: "item-2", text: "Identification of unsubstantiated denials or missing data", sortOrder: 2, isActive: true },
        { id: "item-3", text: "Formal parent objection and documentation of disagreement", sortOrder: 3, isActive: true },
      ]),
      planEligibility: JSON.stringify({
        plan_55: "available_as_addon",
        plan_105: "available_as_addon",
        scholarship: "available_as_addon",
        pay_per_use: "available_as_addon",
        standalone: "available_as_addon",
      }),
    },
  ];

  for (const item of standardServices) {
    const existing: any[] = await queryCloudflareD1(
      `SELECT id FROM services WHERE organizationId = 1 AND serviceCode = ?;`,
      [item.serviceCode]
    );

    const targetFolderId = folderMap.get(item.folderSlug) || null;

    if (existing.length === 0) {
      await queryCloudflareD1(
        `INSERT INTO services (
          organizationId, ownerId, folderId, serviceCode, internalName, clientFacingTitle, name,
          shortDescription, fullDescription, standardPrice, price, currency, billingType,
          sortOrder, icon, accentColor, isActive, isArchived, availableInDiscoveryCall,
          availableInParentPortal, availableInSupportOfferPanel, availableAsStandalone, availableAsAddOn,
          deliveryTimeValue, deliveryTimeUnit, deliveryTimeLabel, allowDocumentUpload, requireDocumentUpload,
          priorityEnabled, priorityPrice, priorityDeliveryTimeLabel, includedItems, planEligibility, createdBy
        ) VALUES (
          1, 1, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, 'usd', ?,
          ?, ?, ?, 1, 0, 1,
          1, 1, 1, 1,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, 'System'
        );`,
        [
          targetFolderId, item.serviceCode, item.internalName, item.clientFacingTitle, item.clientFacingTitle,
          item.shortDescription, item.fullDescription, item.standardPrice, item.standardPrice, item.billingType,
          item.sortOrder, item.icon, item.accentColor,
          item.deliveryTimeValue, item.deliveryTimeUnit, item.deliveryTimeLabel, item.allowDocumentUpload, item.requireDocumentUpload,
          item.priorityEnabled || 0, item.priorityPrice || null, item.priorityDeliveryTimeLabel || null,
          item.includedItems, item.planEligibility
        ]
      );
      console.log(`✓ Seeded standard service: ${item.clientFacingTitle} (${item.serviceCode})`);
    } else {
      console.log(`- Service already exists: ${item.serviceCode} (id: ${existing[0].id})`);
    }
  }

  // 10. Verification query
  console.log("\n=== MIGRATION VERIFICATION ===");
  const activeServices: any[] = await queryCloudflareD1(
    `SELECT id, serviceCode, clientFacingTitle, standardPrice, billingType, isArchived FROM services WHERE organizationId = 1 AND isArchived = 0 ORDER BY sortOrder ASC;`
  );
  console.log(`Active non-archived services count: ${activeServices.length}`);
  console.table(activeServices);

  const archivedServices: any[] = await queryCloudflareD1(
    `SELECT id, name, isArchived FROM services WHERE isArchived = 1;`
  );
  console.log(`Archived duplicates count: ${archivedServices.length}`);

  const activeFolders: any[] = await queryCloudflareD1(
    `SELECT id, name, slug, isArchived FROM serviceFolders WHERE organizationId = 1 AND isArchived = 0 ORDER BY sortOrder ASC;`
  );
  console.log(`Active non-archived folders count: ${activeFolders.length}`);
  console.table(activeFolders);

  console.log("=== PG-035 Migration & Deduplication successfully completed! ===");
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
