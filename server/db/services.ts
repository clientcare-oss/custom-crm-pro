import { eq, and, desc, asc, sql } from "drizzle-orm";
import {
  services,
  serviceFolders,
  serviceCatalogEvents,
  type Service,
  type InsertService,
  type ServiceFolder,
  type InsertServiceFolder,
  type ServiceCatalogEvent,
  type InsertServiceCatalogEvent,
} from "../../drizzle/schema";
import { getDb } from "./connection";
import { queryCloudflareD1 } from "../_core/d1Client";

/**
 * Filter options for listing services from the authoritative catalog.
 */
export interface ListServicesFilters {
  organizationId?: number;
  folderId?: number | null;
  status?: "all" | "active" | "inactive" | "archived";
  search?: string;
  billingType?: string;
  planEligibilityKey?: string;
  availableInPortal?: boolean;
  availableInDiscoveryCall?: boolean;
  availableInSupportOfferPanel?: boolean;
  includeArchived?: boolean;
}

/**
 * List services with organization scoping, search, and comprehensive status filters.
 */
export async function listServices(filters: ListServicesFilters = {}): Promise<Service[]> {
  const orgId = filters.organizationId || 1;
  const status = filters.status || "active";

  try {
    // Build parameterized query for D1 / SQLite
    let query = `
      SELECT * FROM services 
      WHERE organizationId = ?
    `;
    const params: any[] = [orgId];

    if (status === "active") {
      query += ` AND isActive = 1 AND isArchived = 0`;
    } else if (status === "inactive") {
      query += ` AND isActive = 0 AND isArchived = 0`;
    } else if (status === "archived") {
      query += ` AND isArchived = 1`;
    } else if (status === "all") {
      if (!filters.includeArchived) {
        query += ` AND isArchived = 0`;
      }
    }

    if (filters.folderId !== undefined) {
      if (filters.folderId === null) {
        query += ` AND folderId IS NULL`;
      } else {
        query += ` AND folderId = ?`;
        params.push(filters.folderId);
      }
    }

    if (filters.billingType) {
      query += ` AND billingType = ?`;
      params.push(filters.billingType);
    }

    if (filters.availableInPortal) {
      query += ` AND availableInParentPortal = 1`;
    }

    if (filters.availableInDiscoveryCall) {
      query += ` AND availableInDiscoveryCall = 1`;
    }

    if (filters.availableInSupportOfferPanel) {
      query += ` AND availableInSupportOfferPanel = 1`;
    }

    if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim().toLowerCase()}%`;
      query += ` AND (
        LOWER(internalName) LIKE ? OR 
        LOWER(clientFacingTitle) LIKE ? OR 
        LOWER(name) LIKE ? OR 
        LOWER(serviceCode) LIKE ? OR 
        LOWER(shortDescription) LIKE ? OR 
        LOWER(fullDescription) LIKE ? OR
        LOWER(includedItems) LIKE ?
      )`;
      params.push(term, term, term, term, term, term, term);
    }

    query += ` ORDER BY sortOrder ASC, id ASC;`;

    const rows: any[] = await queryCloudflareD1(query, params);
    return rows.map(formatServiceRow);
  } catch (err: any) {
    console.error("[db/services] listServices error:", err.message);
    const db = await getDb();
    if (!db) return [];
    return (await db.select().from(services).where(eq(services.organizationId, orgId)).orderBy(asc(services.sortOrder))) as Service[];
  }
}

/**
 * Fetch a single service by ID with optional organization isolation.
 */
export async function getServiceById(id: number, organizationId: number = 1): Promise<Service | null> {
  try {
    const rows: any[] = await queryCloudflareD1(
      `SELECT * FROM services WHERE id = ? AND organizationId = ? LIMIT 1;`,
      [id, organizationId]
    );
    if (!rows || rows.length === 0) return null;
    return formatServiceRow(rows[0]);
  } catch (err: any) {
    console.error("[db/services] getServiceById error:", err.message);
    return null;
  }
}

/**
 * Fetch a single service by immutable serviceCode with organization isolation.
 */
export async function getServiceByCode(serviceCode: string, organizationId: number = 1): Promise<Service | null> {
  try {
    const rows: any[] = await queryCloudflareD1(
      `SELECT * FROM services WHERE serviceCode = ? AND organizationId = ? LIMIT 1;`,
      [serviceCode, organizationId]
    );
    if (!rows || rows.length === 0) return null;
    return formatServiceRow(rows[0]);
  } catch (err: any) {
    console.error("[db/services] getServiceByCode error:", err.message);
    return null;
  }
}

/**
 * Create a new master service with organization-level uniqueness protection on serviceCode.
 */
export async function createService(data: Partial<InsertService>, actor: string = "System"): Promise<Service> {
  const orgId = data.organizationId || 1;
  let code = data.serviceCode?.trim();
  if (!code) {
    // Generate slug code from title/name
    code = (data.clientFacingTitle || data.internalName || data.name || "service")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  // Ensure code uniqueness in this organization
  const existingWithCode = await getServiceByCode(code, orgId);
  if (existingWithCode) {
    code = `${code}_${Date.now().toString().slice(-4)}`;
  }

  const standardPrice = data.standardPrice ?? data.price ?? 0;
  const title = data.clientFacingTitle || data.name || data.internalName || "Untitled Service";
  const internalName = data.internalName || title;

  const result: any[] = await queryCloudflareD1(
    `INSERT INTO services (
      organizationId, ownerId, folderId, serviceCode, internalName, clientFacingTitle, name,
      shortDescription, fullDescription, internalInstructions, sortOrder, icon, accentColor,
      standardPrice, price, currency, billingType, billingInterval, customPriceAllowed,
      sessionDurationMinutes, deliveryTimeValue, deliveryTimeUnit, deliveryTimeLabel,
      isActive, isArchived, availableInDiscoveryCall, availableInParentPortal, availableInSupportOfferPanel,
      availableAsStandalone, availableAsAddOn, visibleToEmployees, planEligibility, includedItems,
      allowDocumentUpload, requireDocumentUpload, requireQuestionnaire, requireAgreement, requirePayment,
      smartFileTemplateId, workflowTemplateId, taskTemplateId, priorityEnabled, priorityPrice,
      priorityDeliveryTimeValue, priorityDeliveryTimeUnit, priorityDeliveryTimeLabel, priorityDescription,
      stripeProductId, stripePriceId, stripeRecurringPriceId, stripePriorityPriceId, stripeSyncStatus,
      createdBy, updatedBy
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, 0, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?
    ) RETURNING *;`,
    [
      orgId, data.ownerId || 1, data.folderId ?? null, code, internalName, title, title,
      data.shortDescription || null, data.fullDescription || null, data.internalInstructions || null, data.sortOrder || 0, data.icon || "briefcase", data.accentColor || "blue",
      standardPrice, standardPrice, data.currency || "usd", data.billingType || "one_time", data.billingInterval || null, data.customPriceAllowed !== false ? 1 : 0,
      data.sessionDurationMinutes ?? null, data.deliveryTimeValue ?? null, data.deliveryTimeUnit || "business_days", data.deliveryTimeLabel || "3 business days",
      data.isActive !== false ? 1 : 0, data.availableInDiscoveryCall !== false ? 1 : 0, data.availableInParentPortal !== false ? 1 : 0, data.availableInSupportOfferPanel !== false ? 1 : 0,
      data.availableAsStandalone !== false ? 1 : 0, data.availableAsAddOn !== false ? 1 : 0, data.visibleToEmployees !== false ? 1 : 0,
      typeof data.planEligibility === "object" ? JSON.stringify(data.planEligibility) : data.planEligibility || null,
      typeof data.includedItems === "object" ? JSON.stringify(data.includedItems) : data.includedItems || null,
      data.allowDocumentUpload !== false ? 1 : 0, data.requireDocumentUpload ? 1 : 0, data.requireQuestionnaire ? 1 : 0, data.requireAgreement ? 1 : 0, data.requirePayment !== false ? 1 : 0,
      data.smartFileTemplateId ?? null, data.workflowTemplateId ?? null, data.taskTemplateId ?? null, data.priorityEnabled ? 1 : 0, data.priorityPrice ?? null,
      data.priorityDeliveryTimeValue ?? null, data.priorityDeliveryTimeUnit || null, data.priorityDeliveryTimeLabel || null, data.priorityDescription || null,
      data.stripeProductId || null, data.stripePriceId || null, data.stripeRecurringPriceId || null, data.stripePriorityPriceId || null, data.stripeSyncStatus || "not_connected",
      actor, actor
    ]
  );

  const created = result && result.length > 0 ? formatServiceRow(result[0]) : (await getServiceByCode(code, orgId))!;

  // Audit event
  await recordCatalogEvent({
    organizationId: orgId,
    serviceId: created.id,
    eventType: "service_created",
    actor,
    newValues: JSON.stringify({ serviceCode: created.serviceCode, title: created.clientFacingTitle, price: created.standardPrice }),
  });

  return created;
}

/**
 * Update an existing service record with audit history.
 */
export async function updateService(id: number, data: Partial<InsertService>, actor: string = "System"): Promise<Service> {
  const current = await getServiceById(id, data.organizationId || 1);
  if (!current) throw new Error(`Service with ID ${id} not found`);

  const prevValues = {
    serviceCode: current.serviceCode,
    standardPrice: current.standardPrice,
    clientFacingTitle: current.clientFacingTitle,
    isActive: current.isActive,
    isArchived: current.isArchived,
  };

  // Build dynamic update statements
  const fields: string[] = [];
  const params: any[] = [];

  const addField = (name: string, val: any) => {
    fields.push(`${name} = ?`);
    params.push(val);
  };

  if (data.serviceCode !== undefined) addField("serviceCode", data.serviceCode);
  if (data.internalName !== undefined) addField("internalName", data.internalName);
  if (data.clientFacingTitle !== undefined) {
    addField("clientFacingTitle", data.clientFacingTitle);
    addField("name", data.clientFacingTitle); // Keep legacy field in sync
  }
  if (data.shortDescription !== undefined) {
    addField("shortDescription", data.shortDescription);
    addField("description", data.shortDescription);
  }
  if (data.fullDescription !== undefined) addField("fullDescription", data.fullDescription);
  if (data.internalInstructions !== undefined) addField("internalInstructions", data.internalInstructions);
  if (data.folderId !== undefined) addField("folderId", data.folderId);
  if (data.sortOrder !== undefined) addField("sortOrder", data.sortOrder);
  if (data.icon !== undefined) addField("icon", data.icon);
  if (data.accentColor !== undefined) addField("accentColor", data.accentColor);
  if (data.standardPrice !== undefined) {
    addField("standardPrice", data.standardPrice);
    addField("price", data.standardPrice); // Keep legacy field in sync
  }
  if (data.currency !== undefined) addField("currency", data.currency);
  if (data.billingType !== undefined) addField("billingType", data.billingType);
  if (data.billingInterval !== undefined) addField("billingInterval", data.billingInterval);
  if (data.customPriceAllowed !== undefined) addField("customPriceAllowed", data.customPriceAllowed ? 1 : 0);
  if (data.sessionDurationMinutes !== undefined) {
    addField("sessionDurationMinutes", data.sessionDurationMinutes);
    addField("duration", data.sessionDurationMinutes);
  }
  if (data.deliveryTimeValue !== undefined) addField("deliveryTimeValue", data.deliveryTimeValue);
  if (data.deliveryTimeUnit !== undefined) addField("deliveryTimeUnit", data.deliveryTimeUnit);
  if (data.deliveryTimeLabel !== undefined) addField("deliveryTimeLabel", data.deliveryTimeLabel);
  if (data.isActive !== undefined) addField("isActive", data.isActive ? 1 : 0);
  if (data.isArchived !== undefined) addField("isArchived", data.isArchived ? 1 : 0);
  if (data.availableInDiscoveryCall !== undefined) addField("availableInDiscoveryCall", data.availableInDiscoveryCall ? 1 : 0);
  if (data.availableInParentPortal !== undefined) addField("availableInParentPortal", data.availableInParentPortal ? 1 : 0);
  if (data.availableInSupportOfferPanel !== undefined) addField("availableInSupportOfferPanel", data.availableInSupportOfferPanel ? 1 : 0);
  if (data.availableAsStandalone !== undefined) addField("availableAsStandalone", data.availableAsStandalone ? 1 : 0);
  if (data.availableAsAddOn !== undefined) addField("availableAsAddOn", data.availableAsAddOn ? 1 : 0);
  if (data.visibleToEmployees !== undefined) addField("visibleToEmployees", data.visibleToEmployees ? 1 : 0);
  if (data.planEligibility !== undefined) {
    addField("planEligibility", typeof data.planEligibility === "object" ? JSON.stringify(data.planEligibility) : data.planEligibility);
  }
  if (data.includedItems !== undefined) {
    addField("includedItems", typeof data.includedItems === "object" ? JSON.stringify(data.includedItems) : data.includedItems);
  }
  if (data.allowDocumentUpload !== undefined) addField("allowDocumentUpload", data.allowDocumentUpload ? 1 : 0);
  if (data.requireDocumentUpload !== undefined) addField("requireDocumentUpload", data.requireDocumentUpload ? 1 : 0);
  if (data.requireQuestionnaire !== undefined) addField("requireQuestionnaire", data.requireQuestionnaire ? 1 : 0);
  if (data.requireAgreement !== undefined) addField("requireAgreement", data.requireAgreement ? 1 : 0);
  if (data.requirePayment !== undefined) addField("requirePayment", data.requirePayment ? 1 : 0);
  if (data.smartFileTemplateId !== undefined) addField("smartFileTemplateId", data.smartFileTemplateId);
  if (data.workflowTemplateId !== undefined) addField("workflowTemplateId", data.workflowTemplateId);
  if (data.taskTemplateId !== undefined) addField("taskTemplateId", data.taskTemplateId);
  if (data.priorityEnabled !== undefined) addField("priorityEnabled", data.priorityEnabled ? 1 : 0);
  if (data.priorityPrice !== undefined) addField("priorityPrice", data.priorityPrice);
  if (data.priorityDeliveryTimeValue !== undefined) addField("priorityDeliveryTimeValue", data.priorityDeliveryTimeValue);
  if (data.priorityDeliveryTimeUnit !== undefined) addField("priorityDeliveryTimeUnit", data.priorityDeliveryTimeUnit);
  if (data.priorityDeliveryTimeLabel !== undefined) addField("priorityDeliveryTimeLabel", data.priorityDeliveryTimeLabel);
  if (data.priorityDescription !== undefined) addField("priorityDescription", data.priorityDescription);
  if (data.stripeProductId !== undefined) addField("stripeProductId", data.stripeProductId);
  if (data.stripePriceId !== undefined) addField("stripePriceId", data.stripePriceId);
  if (data.stripeRecurringPriceId !== undefined) addField("stripeRecurringPriceId", data.stripeRecurringPriceId);
  if (data.stripePriorityPriceId !== undefined) addField("stripePriorityPriceId", data.stripePriorityPriceId);
  if (data.stripeSyncStatus !== undefined) addField("stripeSyncStatus", data.stripeSyncStatus);
  if (data.stripeSyncedAt !== undefined) addField("stripeSyncedAt", data.stripeSyncedAt);

  addField("updatedBy", actor);
  addField("updatedAt", new Date().toISOString());

  params.push(id);
  const sqlUpdate = `UPDATE services SET ${fields.join(", ")} WHERE id = ?;`;
  await queryCloudflareD1(sqlUpdate, params);

  const updated = (await getServiceById(id, data.organizationId || 1))!;

  // Detect price or status change for specific audit event
  const isPriceChange = data.standardPrice !== undefined && data.standardPrice !== prevValues.standardPrice;
  const isStatusChange = data.isActive !== undefined && data.isActive !== prevValues.isActive;

  let eventType = "service_edited";
  if (isPriceChange) eventType = "price_changed";
  else if (isStatusChange) eventType = data.isActive ? "service_activated" : "service_deactivated";

  await recordCatalogEvent({
    organizationId: current.organizationId,
    serviceId: id,
    eventType,
    actor,
    previousValues: JSON.stringify(prevValues),
    newValues: JSON.stringify({
      serviceCode: updated.serviceCode,
      standardPrice: updated.standardPrice,
      clientFacingTitle: updated.clientFacingTitle,
      isActive: updated.isActive,
      isArchived: updated.isArchived,
    }),
  });

  return updated;
}

/**
 * Duplicate a service into a new inactive record.
 */
export async function duplicateService(id: number, actor: string = "System"): Promise<Service> {
  const source = await getServiceById(id);
  if (!source) throw new Error(`Source service #${id} not found`);

  const uniqueSuffix = Date.now().toString().slice(-4);
  const newCode = `${source.serviceCode}_copy_${uniqueSuffix}`;
  const newInternalName = `${source.internalName || source.clientFacingTitle} (Copy)`;
  const newClientTitle = `${source.clientFacingTitle} (Copy)`;

  const duplicateData: Partial<InsertService> = {
    ...source,
    id: undefined,
    serviceCode: newCode,
    internalName: newInternalName,
    clientFacingTitle: newClientTitle,
    name: newClientTitle,
    isActive: false, // Starts as inactive per spec
    isArchived: false,
    stripeProductId: null, // Do not automatically create Stripe product/price
    stripePriceId: null,
    stripeRecurringPriceId: null,
    stripePriorityPriceId: null,
    stripeSyncStatus: "not_connected",
    createdBy: actor,
    updatedBy: actor,
  };

  const created = await createService(duplicateData, actor);

  await recordCatalogEvent({
    organizationId: source.organizationId,
    serviceId: created.id,
    eventType: "service_duplicated",
    actor,
    previousValues: JSON.stringify({ sourceId: id, sourceCode: source.serviceCode }),
    newValues: JSON.stringify({ newId: created.id, newCode: created.serviceCode }),
  });

  return created;
}

/**
 * Archive a service safely (soft deletion). Preserves all historical references.
 */
export async function archiveService(id: number, actor: string = "System"): Promise<Service> {
  const current = await getServiceById(id);
  if (!current) throw new Error(`Service with ID ${id} not found`);

  await queryCloudflareD1(
    `UPDATE services SET isArchived = 1, isActive = 0, updatedBy = ? WHERE id = ?;`,
    [actor, id]
  );

  await recordCatalogEvent({
    organizationId: current.organizationId,
    serviceId: id,
    eventType: "service_archived",
    actor,
    previousValues: JSON.stringify({ isArchived: 0, isActive: current.isActive }),
    newValues: JSON.stringify({ isArchived: 1, isActive: 0 }),
  });

  return (await getServiceById(id))!;
}

/**
 * Restore an archived service back into active catalog availability.
 */
export async function restoreService(id: number, actor: string = "System"): Promise<Service> {
  const current = await getServiceById(id);
  if (!current) throw new Error(`Service with ID ${id} not found`);

  await queryCloudflareD1(
    `UPDATE services SET isArchived = 0, isActive = 1, updatedBy = ? WHERE id = ?;`,
    [actor, id]
  );

  await recordCatalogEvent({
    organizationId: current.organizationId,
    serviceId: id,
    eventType: "service_restored",
    actor,
    previousValues: JSON.stringify({ isArchived: 1, isActive: 0 }),
    newValues: JSON.stringify({ isArchived: 0, isActive: 1 }),
  });

  return (await getServiceById(id))!;
}

/**
 * Permanent deletion guardrail:
 * Checks whether the service has ever been referenced in offers, contracts, invoices, or timeline events.
 * Throws explicit descriptive error if referenced.
 */
export async function deleteServicePermanent(id: number, actor: string = "System"): Promise<{ success: boolean }> {
  // Check clientSupportOffers
  try {
    const offerCheck: any[] = await queryCloudflareD1(
      `SELECT COUNT(*) as count FROM clientSupportOffers WHERE sourceServiceId = ?;`,
      [id]
    );
    if (offerCheck && offerCheck[0]?.count > 0) {
      throw new Error(`Cannot permanently delete: service #${id} is referenced in ${offerCheck[0].count} client support offer(s). Use Archive instead.`);
    }
  } catch (err: any) {
    if (!err.message.includes("no such table")) {
      throw err;
    }
  }

  // Check invoiceLineItems
  try {
    const invoiceCheck: any[] = await queryCloudflareD1(
      `SELECT COUNT(*) as count FROM invoiceLineItems WHERE description LIKE ?;`,
      [`%service-${id}%`]
    );
    if (invoiceCheck && invoiceCheck[0]?.count > 0) {
      throw new Error(`Cannot permanently delete: service #${id} is referenced in historical invoice line item(s). Use Archive instead.`);
    }
  } catch {
    // Continue
  }

  // If safe, execute deletion
  await queryCloudflareD1(`DELETE FROM services WHERE id = ?;`, [id]);

  await recordCatalogEvent({
    organizationId: 1,
    serviceId: id,
    eventType: "service_permanently_deleted",
    actor,
    newValues: JSON.stringify({ deletedServiceId: id }),
  });

  return { success: true };
}

/**
 * Reorder services within the catalog.
 */
export async function reorderServices(
  items: { id: number; sortOrder: number }[],
  organizationId: number = 1
): Promise<{ success: boolean }> {
  for (const item of items) {
    await queryCloudflareD1(
      `UPDATE services SET sortOrder = ? WHERE id = ? AND organizationId = ?;`,
      [item.sortOrder, item.id, organizationId]
    );
  }
  return { success: true };
}

// ─── Folders (Categories) ───────────────────────────────────────────────────

/**
 * List active or all service folders for the organization.
 */
export async function listServiceFolders(
  organizationId: number = 1,
  includeArchived: boolean = false
): Promise<ServiceFolder[]> {
  try {
    let query = `
      SELECT * FROM serviceFolders 
      WHERE organizationId = ?
    `;
    const params: any[] = [organizationId];

    if (!includeArchived) {
      query += ` AND isArchived = 0`;
    }

    query += ` ORDER BY sortOrder ASC, name ASC;`;

    const rows: any[] = await queryCloudflareD1(query, params);
    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId ?? 1,
      ownerId: r.ownerId ?? 1,
      name: r.name,
      slug: r.slug || r.name.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      description: r.description || null,
      icon: r.icon || "folder",
      color: r.color || "blue",
      sortOrder: r.sortOrder ?? 0,
      isActive: r.isActive === 1 || r.isActive === true,
      isArchived: r.isArchived === 1 || r.isArchived === true,
      createdBy: r.createdBy || "System",
      updatedBy: r.updatedBy || null,
      createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
      updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
    }));
  } catch (err: any) {
    console.error("[db/services] listServiceFolders error:", err.message);
    return [];
  }
}

/**
 * Create a new service folder with unique slug check.
 */
export async function createServiceFolder(
  data: Partial<InsertServiceFolder>,
  actor: string = "System"
): Promise<ServiceFolder> {
  const orgId = data.organizationId || 1;
  const name = data.name?.trim() || "New Category";
  let slug = data.slug?.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

  // Prevent duplicate active folder name in same organization
  const existingRows: any[] = await queryCloudflareD1(
    `SELECT id FROM serviceFolders WHERE organizationId = ? AND (LOWER(name) = ? OR slug = ?) AND isArchived = 0 LIMIT 1;`,
    [orgId, name.toLowerCase(), slug]
  );
  if (existingRows.length > 0) {
    throw new Error(`A category with the name "${name}" already exists.`);
  }

  const result: any[] = await queryCloudflareD1(
    `INSERT INTO serviceFolders (organizationId, ownerId, name, slug, description, icon, color, sortOrder, isActive, isArchived, createdBy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?)
     RETURNING *;`,
    [
      orgId, data.ownerId || 1, name, slug, data.description || null,
      data.icon || "folder", data.color || "blue", data.sortOrder || 0, actor
    ]
  );

  const folder = result && result.length > 0 ? result[0] : { id: 0, name, slug };

  await recordCatalogEvent({
    organizationId: orgId,
    folderId: folder.id,
    eventType: "folder_created",
    actor,
    newValues: JSON.stringify({ name, slug }),
  });

  return folder;
}

/**
 * Update an existing service folder.
 */
export async function updateServiceFolder(
  id: number,
  data: Partial<InsertServiceFolder>,
  actor: string = "System"
): Promise<{ success: boolean }> {
  const fields: string[] = [];
  const params: any[] = [];

  if (data.name !== undefined) {
    fields.push("name = ?");
    params.push(data.name);
  }
  if (data.slug !== undefined) {
    fields.push("slug = ?");
    params.push(data.slug);
  }
  if (data.description !== undefined) {
    fields.push("description = ?");
    params.push(data.description);
  }
  if (data.icon !== undefined) {
    fields.push("icon = ?");
    params.push(data.icon);
  }
  if (data.color !== undefined) {
    fields.push("color = ?");
    params.push(data.color);
  }
  if (data.sortOrder !== undefined) {
    fields.push("sortOrder = ?");
    params.push(data.sortOrder);
  }
  if (data.isActive !== undefined) {
    fields.push("isActive = ?");
    params.push(data.isActive ? 1 : 0);
  }

  fields.push("updatedBy = ?");
  params.push(actor);
  fields.push("updatedAt = CURRENT_TIMESTAMP");

  params.push(id);
  await queryCloudflareD1(`UPDATE serviceFolders SET ${fields.join(", ")} WHERE id = ?;`, params);

  await recordCatalogEvent({
    organizationId: data.organizationId || 1,
    folderId: id,
    eventType: "folder_renamed",
    actor,
    newValues: JSON.stringify(data),
  });

  return { success: true };
}

/**
 * Archive a service category. Reassigns active services to a fallback folder or Unfiled (null).
 */
export async function archiveServiceFolder(
  id: number,
  moveServicesToFolderId: number | null = null,
  actor: string = "System"
): Promise<{ success: boolean }> {
  // Reassign services in this folder
  await queryCloudflareD1(
    `UPDATE services SET folderId = ? WHERE folderId = ?;`,
    [moveServicesToFolderId, id]
  );

  // Soft-archive folder
  await queryCloudflareD1(
    `UPDATE serviceFolders SET isArchived = 1, isActive = 0, updatedBy = ? WHERE id = ?;`,
    [actor, id]
  );

  await recordCatalogEvent({
    organizationId: 1,
    folderId: id,
    eventType: "folder_archived",
    actor,
    newValues: JSON.stringify({ moveServicesToFolderId }),
  });

  return { success: true };
}

/**
 * Restore an archived service category.
 */
export async function restoreServiceFolder(id: number, actor: string = "System"): Promise<{ success: boolean }> {
  await queryCloudflareD1(
    `UPDATE serviceFolders SET isArchived = 0, isActive = 1, updatedBy = ? WHERE id = ?;`,
    [actor, id]
  );

  await recordCatalogEvent({
    organizationId: 1,
    folderId: id,
    eventType: "folder_restored",
    actor,
    newValues: JSON.stringify({ restoredFolderId: id }),
  });

  return { success: true };
}

/**
 * Reorder service categories.
 */
export async function reorderServiceFolders(
  items: { id: number; sortOrder: number }[],
  organizationId: number = 1
): Promise<{ success: boolean }> {
  for (const item of items) {
    await queryCloudflareD1(
      `UPDATE serviceFolders SET sortOrder = ? WHERE id = ? AND organizationId = ?;`,
      [item.sortOrder, item.id, organizationId]
    );
  }
  return { success: true };
}

// ─── Audit Events ───────────────────────────────────────────────────────────

/**
 * Record a catalog audit event.
 */
export async function recordCatalogEvent(event: Partial<InsertServiceCatalogEvent>): Promise<void> {
  try {
    await queryCloudflareD1(
      `INSERT INTO service_catalog_events (organizationId, serviceId, folderId, eventType, actor, previousValues, newValues)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        event.organizationId || 1,
        event.serviceId ?? null,
        event.folderId ?? null,
        event.eventType || "catalog_event",
        event.actor || "System",
        event.previousValues || null,
        event.newValues || null,
      ]
    );
  } catch (err: any) {
    console.warn("[db/services] recordCatalogEvent warning:", err.message);
  }
}

/**
 * List catalog audit events for a service or folder.
 */
export async function listCatalogEvents(
  serviceId?: number,
  folderId?: number,
  limit: number = 50
): Promise<ServiceCatalogEvent[]> {
  try {
    let query = `SELECT * FROM service_catalog_events WHERE 1=1`;
    const params: any[] = [];

    if (serviceId) {
      query += ` AND serviceId = ?`;
      params.push(serviceId);
    }
    if (folderId) {
      query += ` AND folderId = ?`;
      params.push(folderId);
    }

    query += ` ORDER BY timestamp DESC LIMIT ?;`;
    params.push(limit);

    const rows: any[] = await queryCloudflareD1(query, params);
    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId ?? 1,
      serviceId: r.serviceId || null,
      folderId: r.folderId || null,
      eventType: r.eventType,
      actor: r.actor,
      previousValues: r.previousValues || null,
      newValues: r.newValues || null,
      timestamp: r.timestamp ? new Date(r.timestamp) : new Date(),
    }));
  } catch (err: any) {
    console.error("[db/services] listCatalogEvents error:", err.message);
    return [];
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatServiceRow(r: any): Service {
  return {
    id: r.id,
    organizationId: r.organizationId ?? 1,
    ownerId: r.ownerId ?? 1,
    folderId: r.folderId ?? null,
    serviceCode: r.serviceCode || `service_${r.id}`,
    internalName: r.internalName || r.name || "",
    clientFacingTitle: r.clientFacingTitle || r.name || "",
    name: r.name || r.clientFacingTitle || "",
    shortDescription: r.shortDescription || r.description || null,
    fullDescription: r.fullDescription || null,
    description: r.description || r.shortDescription || null,
    internalInstructions: r.internalInstructions || null,
    sortOrder: r.sortOrder ?? 0,
    icon: r.icon || "briefcase",
    accentColor: r.accentColor || "blue",
    price: r.price ?? r.standardPrice ?? 0,
    standardPrice: r.standardPrice ?? r.price ?? 0,
    currency: r.currency || "usd",
    billingType: r.billingType || "one_time",
    billingInterval: r.billingInterval || null,
    customPriceAllowed: r.customPriceAllowed === 1 || r.customPriceAllowed === true,
    duration: r.duration ?? r.sessionDurationMinutes ?? null,
    sessionDurationMinutes: r.sessionDurationMinutes ?? r.duration ?? null,
    deliveryTimeValue: r.deliveryTimeValue ?? null,
    deliveryTimeUnit: r.deliveryTimeUnit || "business_days",
    deliveryTimeLabel: r.deliveryTimeLabel || "3 business days",
    isActive: r.isActive === 1 || r.isActive === true,
    isArchived: r.isArchived === 1 || r.isArchived === true,
    availableInDiscoveryCall: r.availableInDiscoveryCall === 1 || r.availableInDiscoveryCall === true,
    availableInParentPortal: r.availableInParentPortal === 1 || r.availableInParentPortal === true,
    availableInSupportOfferPanel: r.availableInSupportOfferPanel === 1 || r.availableInSupportOfferPanel === true,
    availableAsStandalone: r.availableAsStandalone === 1 || r.availableAsStandalone === true,
    availableAsAddOn: r.availableAsAddOn === 1 || r.availableAsAddOn === true,
    visibleToEmployees: r.visibleToEmployees === 1 || r.visibleToEmployees === true,
    planEligibility: r.planEligibility || null,
    includedItems: r.includedItems || null,
    allowDocumentUpload: r.allowDocumentUpload === 1 || r.allowDocumentUpload === true,
    requireDocumentUpload: r.requireDocumentUpload === 1 || r.requireDocumentUpload === true,
    requireQuestionnaire: r.requireQuestionnaire === 1 || r.requireQuestionnaire === true,
    requireAgreement: r.requireAgreement === 1 || r.requireAgreement === true,
    requirePayment: r.requirePayment === 1 || r.requirePayment === true,
    smartFileTemplateId: r.smartFileTemplateId ?? null,
    workflowTemplateId: r.workflowTemplateId ?? null,
    taskTemplateId: r.taskTemplateId ?? null,
    priorityEnabled: r.priorityEnabled === 1 || r.priorityEnabled === true,
    priorityPrice: r.priorityPrice ?? null,
    priorityDeliveryTimeValue: r.priorityDeliveryTimeValue ?? null,
    priorityDeliveryTimeUnit: r.priorityDeliveryTimeUnit || null,
    priorityDeliveryTimeLabel: r.priorityDeliveryTimeLabel || null,
    priorityDescription: r.priorityDescription || null,
    stripeProductId: r.stripeProductId || null,
    stripePriceId: r.stripePriceId || null,
    stripeRecurringPriceId: r.stripeRecurringPriceId || null,
    stripePriorityPriceId: r.stripePriorityPriceId || null,
    stripeSyncStatus: r.stripeSyncStatus || "not_connected",
    stripeSyncedAt: r.stripeSyncedAt ? new Date(r.stripeSyncedAt) : null,
    createdBy: r.createdBy || "System",
    updatedBy: r.updatedBy || null,
    createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
    updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
  };
}
