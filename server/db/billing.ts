import { eq, and, desc, sql } from "drizzle-orm";
import { invoices, invoiceLineItems, contracts, vaultSubscriptions, contacts } from "../../drizzle/schema";
import { getDb } from "./connection";

export async function getInvoicesByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(invoices)
    .where(eq(invoices.clientId, clientId))
    .orderBy(desc(invoices.createdAt));
}

export async function getInvoiceById(id: number, userId?: number, userRole?: string) {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    const { inMemoryInvoices } = await import("./referrals");
    if (inMemoryInvoices.has(id)) {
      return inMemoryInvoices.get(id);
    }
  }

  const db = await getDb();
  if (!db) return undefined;

  if (userId && userRole) {
    const query =
      userRole === "admin"
        ? and(eq(invoices.id, id), eq(invoices.ownerId, userId))
        : and(eq(invoices.id, id), eq(invoices.clientId, userId));

    const result = await db.select().from(invoices).where(query).limit(1);
    return result.length > 0 ? result[0] : undefined;
  }

  const result = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getInvoiceLineItems(invoiceId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, invoiceId));
}

/**
 * Retrieves a single invoice with full client details and line items.
 */
export async function getInvoiceWithDetails(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const [inv] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, id))
    .limit(1);

  if (!inv) return undefined;

  let clientInfo: any = null;
  if (inv.clientId) {
    const [c] = await db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        phone: contacts.phone,
        company: contacts.company,
        address: contacts.address,
        city: contacts.city,
        state: contacts.state,
        zip: contacts.zipCode,
      })
      .from(contacts)
      .where(eq(contacts.id, inv.clientId))
      .limit(1);
    clientInfo = c;
  }

  const items = await db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, id));

  return {
    ...inv,
    client: clientInfo,
    lineItems: items,
  };
}

/**
 * Retrieves all invoices with client details and line items for the Invoice Management console.
 */
export async function listAllInvoicesDetailed(filters?: {
  status?: string;
  clientId?: number;
  search?: string;
  ownerId?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  // Query base invoices
  let query = db.select().from(invoices);
  const conditions: any[] = [];

  if (filters?.clientId) {
    conditions.push(eq(invoices.clientId, filters.clientId));
  }

  if (filters?.status && filters.status !== "all") {
    conditions.push(eq(invoices.status, filters.status as any));
  }

  const allInvoices = conditions.length > 0
    ? await query.where(and(...conditions)).orderBy(desc(invoices.createdAt))
    : await query.orderBy(desc(invoices.createdAt));

  if (allInvoices.length === 0) return [];

  // Fetch all contacts to attach client metadata
  const allContacts = await db
    .select({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      phone: contacts.phone,
      company: contacts.company,
    })
    .from(contacts);

  const contactMap = new Map(allContacts.map((c) => [c.id, c]));

  // Fetch line items for all invoices
  const allItems = await db.select().from(invoiceLineItems);
  const itemsMap = new Map<number, any[]>();
  for (const item of allItems) {
    const arr = itemsMap.get(item.invoiceId) || [];
    arr.push(item);
    itemsMap.set(item.invoiceId, arr);
  }

  let enriched = allInvoices.map((inv) => {
    const client = inv.clientId ? contactMap.get(inv.clientId) : null;
    const lineItems = itemsMap.get(inv.id) || [];
    return {
      ...inv,
      client,
      lineItems,
    };
  });

  // Client-side text search if provided
  if (filters?.search && filters.search.trim()) {
    const s = filters.search.toLowerCase().trim();
    enriched = enriched.filter((inv) => {
      const matchNumber = inv.invoiceNumber?.toLowerCase().includes(s);
      const matchClient = inv.client
        ? `${inv.client.firstName} ${inv.client.lastName} ${inv.client.email} ${inv.client.company}`.toLowerCase().includes(s)
        : false;
      const matchItems = inv.lineItems?.some((item: any) => item.description?.toLowerCase().includes(s));
      return matchNumber || matchClient || matchItems;
    });
  }

  return enriched;
}

/**
 * Creates a one-time invoice with multiple line items, optional discount, and Stripe linkage.
 */
export async function createOneTimeInvoice(
  data: {
    clientId?: number;
    projectId?: number;
    invoiceNumber?: string;
    amount: string;
    tax?: string;
    total: string;
    discountAmount?: string;
    discountNote?: string | null;
    notes?: string | null;
    status?: "Draft" | "Sent" | "Paid" | "Overdue" | "Cancelled" | "Voided";
    dueDate?: Date | string;
    lineItems?: Array<{
      serviceId?: number;
      description: string;
      quantity: string | number;
      unitPrice: string | number;
      total: string | number;
    }>;
  },
  ownerId = 1
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const invNumber = data.invoiceNumber || `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

  const [insertResult] = await db.insert(invoices).values({
    ownerId,
    clientId: data.clientId,
    projectId: data.projectId,
    invoiceNumber: invNumber,
    amount: data.amount,
    tax: data.tax || "0.00",
    total: data.total,
    discountAmount: data.discountAmount || "0.00",
    discountNote: data.discountNote || null,
    notes: data.notes || null,
    status: data.status || "Draft",
    dueDate: data.dueDate ? (data.dueDate instanceof Date ? data.dueDate : new Date(data.dueDate)) : undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const invoiceId = Number((insertResult as any)?.insertId);

  // Insert line items if provided
  if (data.lineItems && data.lineItems.length > 0 && invoiceId) {
    const itemsToInsert = data.lineItems.map((item) => ({
      invoiceId,
      serviceId: item.serviceId || null,
      description: item.description,
      quantity: String(item.quantity || "1"),
      unitPrice: String(item.unitPrice || "0"),
      total: String(item.total || "0"),
    }));
    await db.insert(invoiceLineItems).values(itemsToInsert);
  }

  return await getInvoiceWithDetails(invoiceId);
}

/**
 * Updates an invoice and its line items.
 */
export async function updateOneTimeInvoice(
  id: number,
  data: {
    clientId?: number;
    invoiceNumber?: string;
    amount?: string;
    tax?: string;
    total?: string;
    discountAmount?: string;
    discountNote?: string;
    notes?: string;
    status?: "Draft" | "Sent" | "Paid" | "Overdue" | "Cancelled" | "Voided";
    dueDate?: Date | string;
    stripePaymentUrl?: string;
    sentAt?: Date;
    sentToEmail?: string;
    lineItems?: Array<{
      serviceId?: number;
      description: string;
      quantity: string | number;
      unitPrice: string | number;
      total: string | number;
    }>;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { lineItems, ...invoiceFields } = data;

  await db
    .update(invoices)
    .set({
      ...invoiceFields,
      dueDate: invoiceFields.dueDate
        ? invoiceFields.dueDate instanceof Date
          ? invoiceFields.dueDate
          : new Date(invoiceFields.dueDate)
        : undefined,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, id));

  // If line items provided, replace them
  if (lineItems && lineItems.length > 0) {
    await db.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, id));
    const itemsToInsert = lineItems.map((item) => ({
      invoiceId: id,
      serviceId: item.serviceId || null,
      description: item.description,
      quantity: String(item.quantity || "1"),
      unitPrice: String(item.unitPrice || "0"),
      total: String(item.total || "0"),
    }));
    await db.insert(invoiceLineItems).values(itemsToInsert);
  }

  return await getInvoiceWithDetails(id);
}

/**
 * Voids an unpaid invoice.
 */
export async function voidInvoice(id: number, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getInvoiceWithDetails(id);
  if (!existing) throw new Error("Invoice not found");

  if (existing.status === "Paid") {
    throw new Error("Cannot void an invoice that is already paid. Please issue a refund instead.");
  }

  const updatedNotes = reason
    ? `${existing.notes || ""}\n[Voided on ${new Date().toLocaleDateString()}: ${reason}]`.trim()
    : existing.notes;

  await db
    .update(invoices)
    .set({
      status: "Voided",
      notes: updatedNotes,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, id));

  return await getInvoiceWithDetails(id);
}

/**
 * Marks an invoice as Paid and records the payment intent and timestamp.
 */
export async function recordInvoicePayment(
  id: number,
  paymentData: {
    stripePaymentIntentId?: string;
    stripeInvoiceId?: string;
    paymentNote?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getInvoiceWithDetails(id);
  if (!existing) throw new Error("Invoice not found");

  // Idempotency: if already paid, return early to prevent duplicate processing
  if (existing.status === "Paid") {
    return existing;
  }

  await db
    .update(invoices)
    .set({
      status: "Paid",
      paidDate: new Date(),
      stripePaymentIntentId: paymentData.stripePaymentIntentId || existing.stripePaymentIntentId,
      stripeInvoiceId: paymentData.stripeInvoiceId || existing.stripeInvoiceId,
      paymentStatusNote: paymentData.paymentNote || "Payment completed via Stripe",
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, id));

  return await getInvoiceWithDetails(id);
}

/**
 * Records a refund on an invoice.
 */
export async function recordInvoiceRefund(
  id: number,
  refundData: {
    refundedAmount: string;
    refundStatus: string;
    reason?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getInvoiceWithDetails(id);
  if (!existing) throw new Error("Invoice not found");

  const updatedNotes = refundData.reason
    ? `${existing.notes || ""}\n[Refund of $${refundData.refundedAmount} processed on ${new Date().toLocaleDateString()}: ${refundData.reason}]`.trim()
    : existing.notes;

  await db
    .update(invoices)
    .set({
      refundedAmount: refundData.refundedAmount,
      refundStatus: refundData.refundStatus,
      notes: updatedNotes,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, id));

  return await getInvoiceWithDetails(id);
}

export async function getContractsByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(contracts)
    .where(eq(contracts.clientId, clientId))
    .orderBy(desc(contracts.createdAt));
}

export async function getVaultSubscription(clientId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const [sub] = await db
    .select()
    .from(vaultSubscriptions)
    .where(eq(vaultSubscriptions.clientId, clientId))
    .limit(1);

  return sub ?? undefined;
}
