import { eq, and, desc } from "drizzle-orm";
import { invoices, invoiceLineItems, contracts, vaultSubscriptions } from "../../drizzle/schema";
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
