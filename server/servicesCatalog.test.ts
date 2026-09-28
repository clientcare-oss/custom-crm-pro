import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getLocalDbClient } from "./_core/d1Client";
import {
  listServices,
  getServiceById,
  getServiceByCode,
  createService,
  updateService,
  duplicateService,
  archiveService,
  restoreService,
  deleteServicePermanent,
  listServiceFolders,
  createServiceFolder,
  archiveServiceFolder,
  listCatalogEvents,
} from "./db/services";

describe("PG-035 Advocacy Services Catalog Master Library", () => {
  const mockAdvocateUser = {
    id: 1,
    openId: "user_test_byron",
    name: "Byron Honea",
    email: "byron@waypointadvocates.com",
    role: "admin" as const,
    loginMethod: "manually_created",
    organizationId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    phone: null,
    quoWebhookSecret: null,
    gmailUser: null,
    gmailAppPassword: null,
    portalDomain: null,
    logoUrl: null,
  };

  const adminCtx = {
    user: mockAdvocateUser,
    req: {} as any,
    res: {} as any,
  };

  const publicCtx = {
    user: null,
    req: {} as any,
    res: {} as any,
  };

  const adminCaller = appRouter.createCaller(adminCtx);
  const publicCaller = appRouter.createCaller(publicCtx);

  beforeAll(async () => {
    const client = getLocalDbClient();
    try {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS service_folders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          organizationId INTEGER NOT NULL DEFAULT 1,
          name TEXT NOT NULL,
          slug TEXT NOT NULL,
          description TEXT,
          icon TEXT DEFAULT 'folder',
          color TEXT DEFAULT 'blue',
          sortOrder INTEGER NOT NULL DEFAULT 0,
          isArchived INTEGER NOT NULL DEFAULT 0,
          createdBy TEXT NOT NULL DEFAULT 'System',
          updatedBy TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await client.execute(`
        CREATE TABLE IF NOT EXISTS services (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          organizationId INTEGER NOT NULL DEFAULT 1,
          ownerId INTEGER NOT NULL DEFAULT 1,
          folderId INTEGER,
          serviceCode TEXT NOT NULL,
          internalName TEXT NOT NULL,
          clientFacingTitle TEXT NOT NULL,
          name TEXT NOT NULL,
          shortDescription TEXT,
          fullDescription TEXT,
          internalInstructions TEXT,
          sortOrder INTEGER NOT NULL DEFAULT 0,
          icon TEXT DEFAULT 'briefcase',
          accentColor TEXT DEFAULT 'blue',
          price INTEGER,
          standardPrice INTEGER NOT NULL DEFAULT 0,
          currency TEXT NOT NULL DEFAULT 'usd',
          billingType TEXT NOT NULL DEFAULT 'one_time',
          billingInterval TEXT,
          customPriceAllowed INTEGER NOT NULL DEFAULT 1,
          sessionDurationMinutes INTEGER,
          deliveryTimeValue INTEGER,
          deliveryTimeUnit TEXT DEFAULT 'business_days',
          deliveryTimeLabel TEXT DEFAULT '3 business days',
          isActive INTEGER NOT NULL DEFAULT 1,
          isArchived INTEGER NOT NULL DEFAULT 0,
          availableInDiscoveryCall INTEGER NOT NULL DEFAULT 1,
          availableInParentPortal INTEGER NOT NULL DEFAULT 1,
          availableInSupportOfferPanel INTEGER NOT NULL DEFAULT 1,
          availableAsStandalone INTEGER NOT NULL DEFAULT 1,
          availableAsAddOn INTEGER NOT NULL DEFAULT 1,
          visibleToEmployees INTEGER NOT NULL DEFAULT 1,
          planEligibility TEXT,
          includedItems TEXT,
          allowDocumentUpload INTEGER NOT NULL DEFAULT 1,
          requireDocumentUpload INTEGER NOT NULL DEFAULT 0,
          requireQuestionnaire INTEGER NOT NULL DEFAULT 0,
          requireAgreement INTEGER NOT NULL DEFAULT 0,
          requirePayment INTEGER NOT NULL DEFAULT 1,
          smartFileTemplateId INTEGER,
          workflowTemplateId INTEGER,
          taskTemplateId INTEGER,
          priorityEnabled INTEGER NOT NULL DEFAULT 0,
          priorityPrice INTEGER,
          priorityDeliveryTimeValue INTEGER,
          priorityDeliveryTimeUnit TEXT,
          priorityDeliveryTimeLabel TEXT,
          priorityDescription TEXT,
          stripeProductId TEXT,
          stripePriceId TEXT,
          stripeRecurringPriceId TEXT,
          stripePriorityPriceId TEXT,
          stripeSyncStatus TEXT NOT NULL DEFAULT 'not_connected',
          stripeSyncedAt TEXT,
          createdBy TEXT NOT NULL DEFAULT 'System',
          updatedBy TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await client.execute(`
        CREATE TABLE IF NOT EXISTS service_catalog_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          organizationId INTEGER NOT NULL DEFAULT 1,
          serviceId INTEGER,
          folderId INTEGER,
          eventType TEXT NOT NULL,
          actor TEXT NOT NULL,
          details TEXT,
          previousValues TEXT,
          newValues TEXT,
          ipAddress TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const existing = await client.execute("SELECT id, serviceCode FROM services WHERE organizationId = 1");
      const codes = new Set(existing.rows.map((r: any) => r.serviceCode));

      if (!codes.has("state_complaint_support")) {
        await client.execute({
          sql: `INSERT INTO services (
            id, organizationId, ownerId, serviceCode, internalName, clientFacingTitle, name,
            standardPrice, price, currency, billingType, isActive, isArchived, availableInDiscoveryCall,
            availableInParentPortal, availableInSupportOfferPanel, availableAsStandalone, availableAsAddOn,
            visibleToEmployees, allowDocumentUpload, requirePayment, stripeSyncStatus, createdBy
          ) VALUES (
            3, 1, 1, 'state_complaint_support', 'State Complaint Support', 'State Complaint Support', 'State Complaint Support',
            20000, 20000, 'usd', 'one_time', 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 'not_connected', 'System'
          );`,
          args: []
        });
      }

      if (!codes.has("advocacy_plan_55")) {
        await client.execute({
          sql: `INSERT INTO services (
            organizationId, ownerId, serviceCode, internalName, clientFacingTitle, name,
            standardPrice, price, currency, billingType, billingInterval, isActive, isArchived, createdBy
          ) VALUES (
            1, 1, 'advocacy_plan_55', 'Advocacy Plan $55', 'Advocacy Plan $55', 'Advocacy Plan $55',
            5500, 5500, 'usd', 'recurring', 'monthly', 1, 0, 'System'
          );`,
          args: []
        });
      }

      if (!codes.has("advocacy_plan_105")) {
        await client.execute({
          sql: `INSERT INTO services (
            organizationId, ownerId, serviceCode, internalName, clientFacingTitle, name,
            standardPrice, price, currency, billingType, billingInterval, isActive, isArchived, createdBy
          ) VALUES (
            1, 1, 'advocacy_plan_105', 'Advocacy Plan $105', 'Advocacy Plan $105', 'Advocacy Plan $105',
            10500, 10500, 'usd', 'recurring', 'monthly', 1, 0, 'System'
          );`,
          args: []
        });
      }
    } catch (e: any) {
      console.warn("Test setup database warning:", e.message);
    }
  });

  it("1. Public catalog loads active non-archived services without duplicate records", async () => {
    const catalog = await publicCaller.services.publicCatalog();
    expect(catalog.services).toBeDefined();
    expect(catalog.folders).toBeDefined();

    // Verify duplicate folders (IDs 5..8) are not in active list
    const folderIds = catalog.folders.map((f: any) => f.id);
    expect(folderIds).not.toContain(5);
    expect(folderIds).not.toContain(6);
    expect(folderIds).not.toContain(7);
    expect(folderIds).not.toContain(8);

    // Verify duplicate services (IDs 10..18) are not in active list
    const serviceIds = catalog.services.map((s: any) => s.id);
    for (let id = 10; id <= 18; id++) {
      expect(serviceIds).not.toContain(id);
    }
  });

  it("2. Authoritative State Complaint Support is exactly $200 one-time", async () => {
    const stateComplaint = await adminCaller.services.getByCode({
      serviceCode: "state_complaint_support",
    });

    expect(stateComplaint).toBeDefined();
    expect(stateComplaint?.clientFacingTitle).toBe("State Complaint Support");
    expect(stateComplaint?.standardPrice).toBe(20000); // 20000 cents = $200.00
    expect(stateComplaint?.billingType).toBe("one_time");
    expect(stateComplaint?.isArchived).toBe(false);
  });

  it("3. Membership plans have stable service codes and recurring monthly billing", async () => {
    const plan55 = await adminCaller.services.getByCode({
      serviceCode: "advocacy_plan_55",
    });
    expect(plan55).toBeDefined();
    expect(plan55?.standardPrice).toBe(5500); // $55.00
    expect(plan55?.billingType).toBe("recurring");
    expect(plan55?.billingInterval).toBe("monthly");

    const plan105 = await adminCaller.services.getByCode({
      serviceCode: "advocacy_plan_105",
    });
    expect(plan105).toBeDefined();
    expect(plan105?.standardPrice).toBe(10500); // $105.00
    expect(plan105?.billingType).toBe("recurring");
    expect(plan105?.billingInterval).toBe("monthly");
  });

  it("4. Organization scoping: services are scoped to organizationId = 1", async () => {
    const orgServices = await listServices({ organizationId: 1, status: "active" });
    expect(orgServices.length).toBeGreaterThan(0);
    for (const s of orgServices) {
      expect(s.organizationId).toBe(1);
    }
  });

  it("5. Search filter searches across title, code, and description", async () => {
    const searchResults = await adminCaller.services.list({
      search: "State Complaint",
      status: "all",
    });
    expect(searchResults.length).toBeGreaterThan(0);
    const hasMatch = searchResults.some(
      (s: any) => s.serviceCode === "state_complaint_support" || s.clientFacingTitle.includes("State Complaint")
    );
    expect(hasMatch).toBe(true);
  });

  it("6. Duplicating a service creates a new inactive record with a unique serviceCode", async () => {
    // Duplicate canonical service (State Complaint)
    const stateComplaint = await adminCaller.services.getByCode({
      serviceCode: "state_complaint_support",
    });
    const duplicate = await adminCaller.services.duplicate({ id: stateComplaint?.id || 3 });

    expect(duplicate).toBeDefined();
    expect(duplicate.id).not.toBe(stateComplaint?.id || 3);
    expect(duplicate.serviceCode).toContain("copy");
    expect(duplicate.isActive).toBe(false); // Must start as inactive per spec
    expect(duplicate.isArchived).toBe(false);
    expect(duplicate.standardPrice).toBe(20000);

    // Clean up test duplicate safely
    await deleteServicePermanent(duplicate.id, "Test Runner");
  });

  it("7. Archiving a service soft-deletes it without destroying historical references", async () => {
    // Create a temporary service to archive
    const temp = await createService(
      {
        serviceCode: "temp_test_service_archive",
        clientFacingTitle: "Temporary Test Service",
        standardPrice: 9900,
        organizationId: 1,
        isActive: true,
      },
      "Test Runner"
    );

    expect(temp.isArchived).toBe(false);
    expect(temp.isActive).toBe(true);

    // Archive
    const archived = await archiveService(temp.id, "Test Runner");
    expect(archived.isArchived).toBe(true);
    expect(archived.isActive).toBe(false);

    // Restore
    const restored = await restoreService(temp.id, "Test Runner");
    expect(restored.isArchived).toBe(false);
    expect(restored.isActive).toBe(true);

    // Clean up
    await deleteServicePermanent(temp.id, "Test Runner");
  });

  it("8. Audit history records service and folder change events", async () => {
    const events = await adminCaller.services.events({ limit: 10 });
    expect(events).toBeDefined();
    expect(events.length).toBeGreaterThan(0);
  });
});
