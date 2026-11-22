import {
  normalizeEmailForMatch,
  normalizeFullNameForMatch,
  normalizePhoneForMatch,
  type DoNotServeIdentifierType,
  type DoNotServeScope,
} from "../../shared/doNotServe";
import { inMemoryContacts, updateContact, deleteContact } from "../db/contacts";
import {
  _execDnsRunInternal,
  _execDnsSelectInternal,
  getActiveDoNotServeIdentifiersDb,
  getDoNotServeEntryByIdDb,
} from "../db/doNotServe";
import {
  insertDoNotServeAuditDb,
  type DoNotServeActorStamp,
} from "../db/doNotServeMutations";
import {
  findEntriesAffectingContactDb,
  replaceAutoSyncedIdentifiersDb,
} from "../db/doNotServeNotesAndResolutions";

const ADDITIONAL_PHONES_REGEX = /\[Additional Phones:\s*([^\]]+)\]/i;
const ADDITIONAL_EMAILS_REGEX = /\[Additional Emails:\s*([^\]]+)\]/i;

export async function loadContactByIdSafe(contactId: number): Promise<any | null> {
  if (!contactId || contactId <= 0) return null;
  if (inMemoryContacts.has(contactId)) {
    return inMemoryContacts.get(contactId) || null;
  }
  const rows = await _execDnsSelectInternal(
    `SELECT * FROM contacts WHERE id = ? LIMIT 1`,
    [contactId]
  );
  return rows[0] || null;
}

export async function loadHouseholdContactsSafe(anchorContactId: number): Promise<any[]> {
  if (!anchorContactId || anchorContactId <= 0) return [];
  const dbRows = await _execDnsSelectInternal(
    `SELECT * FROM contacts WHERE id = ? OR parentContactId = ?`,
    [anchorContactId, anchorContactId]
  );
  const byId = new Map<number, any>();
  for (const r of dbRows) {
    byId.set(Number(r.id), r);
  }
  for (const [, mem] of Array.from(inMemoryContacts.entries())) {
    if (Number(mem.id) === anchorContactId || Number(mem.parentContactId) === anchorContactId) {
      byId.set(Number(mem.id), { ...(byId.get(Number(mem.id)) || {}), ...mem });
    }
  }
  return Array.from(byId.values());
}

function extractOwnAdditionalPhones(notes?: string | null): string[] {
  if (!notes) return [];
  const m = String(notes).match(ADDITIONAL_PHONES_REGEX);
  if (!m?.[1]) return [];
  return m[1]
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function extractOwnAdditionalEmails(notes?: string | null): string[] {
  if (!notes) return [];
  const m = String(notes).match(ADDITIONAL_EMAILS_REGEX);
  if (!m?.[1]) return [];
  return m[1]
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function collectContactScopeIdentifiers(
  contactId: number,
  appliesTo: DoNotServeScope
): Promise<{
  contact: any;
  householdAnchorId: number;
  displayName: string;
  primaryPhone: string | null;
  primaryEmail: string | null;
  identifiers: Array<{
    identifierType: DoNotServeIdentifierType;
    rawValue: string;
    normalizedValue: string;
    label: string | null;
    isAutoSynced: boolean;
  }>;
}> {
  const contact = await loadContactByIdSafe(contactId);
  if (!contact) {
    throw new Error(`Contact #${contactId} not found.`);
  }

  const fullName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || `Contact #${contactId}`;
  const householdAnchorId = contact.parentContactId
    ? Number(contact.parentContactId)
    : Number(contact.id);

  const identifiers: Array<{
    identifierType: DoNotServeIdentifierType;
    rawValue: string;
    normalizedValue: string;
    label: string | null;
    isAutoSynced: boolean;
  }> = [];

  const pushIdent = (
    identifierType: DoNotServeIdentifierType,
    rawValue: string | null | undefined,
    normalizedValue: string | null | undefined,
    label: string | null
  ) => {
    if (!rawValue || !normalizedValue) return;
    identifiers.push({
      identifierType,
      rawValue: String(rawValue).trim(),
      normalizedValue,
      label,
      isAutoSynced: true,
    });
  };

  // Always link the selected individual's own contact ID, own phones, own emails, and own full name
  pushIdent("contact_id", String(contact.id), String(contact.id), "Linked client record");
  pushIdent("phone", contact.phone, normalizePhoneForMatch(contact.phone), "Primary phone");
  for (const extraPhone of extractOwnAdditionalPhones(contact.notes)) {
    pushIdent("phone", extraPhone, normalizePhoneForMatch(extraPhone), "Additional phone");
  }
  pushIdent("email", contact.email, normalizeEmailForMatch(contact.email), "Primary email");
  for (const extraEmail of extractOwnAdditionalEmails(contact.notes)) {
    pushIdent("email", extraEmail, normalizeEmailForMatch(extraEmail), "Additional email");
  }
  pushIdent("full_name", fullName, normalizeFullNameForMatch(fullName), "Full name");

  // Only when Household scope is explicitly chosen do we extend to co-parents, household anchor, and linked student records
  if (appliesTo === "household") {
    const members = await loadHouseholdContactsSafe(householdAnchorId);
    for (const member of members) {
      const mId = Number(member.id);
      if (mId !== Number(contact.id)) {
        const mName = `${member.firstName || ""} ${member.lastName || ""}`.trim();
        pushIdent(
          "household_contact_id",
          String(mId),
          String(mId),
          mName ? `Household member (${mName})` : "Household member"
        );
        pushIdent("phone", member.phone, normalizePhoneForMatch(member.phone), "Household phone");
        pushIdent("email", member.email, normalizeEmailForMatch(member.email), "Household email");
        pushIdent("full_name", mName, normalizeFullNameForMatch(mName), "Household member name");
      }
      if (member.secondParentPhone) {
        pushIdent(
          "phone",
          member.secondParentPhone,
          normalizePhoneForMatch(member.secondParentPhone),
          "Second parent phone"
        );
      }
      if (member.secondParentEmail) {
        pushIdent(
          "email",
          member.secondParentEmail,
          normalizeEmailForMatch(member.secondParentEmail),
          "Second parent email"
        );
      }
      if (member.secondParentName) {
        pushIdent(
          "full_name",
          member.secondParentName,
          normalizeFullNameForMatch(member.secondParentName),
          "Second parent name"
        );
      }
    }
  }

  return {
    contact,
    householdAnchorId,
    displayName: fullName,
    primaryPhone: contact.phone ? String(contact.phone).trim() : null,
    primaryEmail: contact.email ? String(contact.email).trim() : null,
    identifiers,
  };
}

export async function syncContactWithDoNotServe(params: {
  contactId: number;
  ownerId: number;
  actor: DoNotServeActorStamp;
}): Promise<void> {
  const affectedEntryIds = await findEntriesAffectingContactDb(params.ownerId, [params.contactId]);
  if (affectedEntryIds.length === 0) return;

  for (const entryId of affectedEntryIds) {
    const detail = await getDoNotServeEntryByIdDb(entryId, params.ownerId);
    if (!detail || !detail.entry.linkedContactId) continue;

    try {
      const scopeData = await collectContactScopeIdentifiers(
        detail.entry.linkedContactId,
        detail.entry.appliesTo
      );
      const isDirectSubject = detail.entry.linkedContactId === params.contactId;

      await replaceAutoSyncedIdentifiersDb({
        entryId,
        ownerId: params.ownerId,
        displayName: isDirectSubject ? scopeData.displayName : undefined,
        normalizedFullName: isDirectSubject
          ? normalizeFullNameForMatch(scopeData.displayName)
          : undefined,
        primaryPhone: isDirectSubject ? scopeData.primaryPhone : undefined,
        normalizedPrimaryPhone: isDirectSubject
          ? normalizePhoneForMatch(scopeData.primaryPhone)
          : undefined,
        primaryEmail: isDirectSubject ? scopeData.primaryEmail : undefined,
        normalizedPrimaryEmail: isDirectSubject
          ? normalizeEmailForMatch(scopeData.primaryEmail)
          : undefined,
        identifiers: scopeData.identifiers.map((i) => ({
          identifierType: i.identifierType,
          rawValue: i.rawValue,
          normalizedValue: i.normalizedValue,
          label: i.label,
        })),
        actor: params.actor,
      });

      await insertDoNotServeAuditDb({
        entryId,
        ownerId: params.ownerId,
        action: "contact_synced",
        summary: `Synchronized matching identifiers after authorized edit on Contact #${params.contactId}.`,
        targetEntityType: "contact",
        targetEntityId: String(params.contactId),
        actorUserId: params.actor.actorUserId,
        actorEmployeeId: params.actor.actorEmployeeId,
        actorName: params.actor.actorName,
      });
    } catch {
      // Contact might have been deleted; keep existing restriction identifiers intact
    }
  }
}

export async function mergeContactsPreservingDoNotServe(params: {
  sourceContactId: number;
  targetContactId: number;
  ownerId: number;
  actor: DoNotServeActorStamp;
}): Promise<{ mergedContactId: number; transferredEntries: number }> {
  if (params.sourceContactId === params.targetContactId) {
    throw new Error("Source and target contacts must be different records.");
  }
  const source = await loadContactByIdSafe(params.sourceContactId);
  const target = await loadContactByIdSafe(params.targetContactId);
  if (!source || !target) {
    throw new Error("Both source and target contacts must exist to merge.");
  }

  // Merge missing fields + preserve source phones/emails as additional channels on target
  const extraPhones = new Set<string>();
  const extraEmails = new Set<string>();
  if (source.phone && source.phone !== target.phone) extraPhones.add(String(source.phone).trim());
  if (source.email && source.email !== target.email) extraEmails.add(String(source.email).trim());
  for (const p of extractOwnAdditionalPhones(source.notes)) extraPhones.add(p);
  for (const p of extractOwnAdditionalPhones(target.notes)) extraPhones.add(p);
  for (const e of extractOwnAdditionalEmails(source.notes)) extraEmails.add(e);
  for (const e of extractOwnAdditionalEmails(target.notes)) extraEmails.add(e);

  let mergedNotes = String(target.notes || "")
    .replace(ADDITIONAL_PHONES_REGEX, "")
    .replace(ADDITIONAL_EMAILS_REGEX, "")
    .trim();
  if (extraPhones.size > 0) {
    mergedNotes = `${mergedNotes}\n[Additional Phones: ${Array.from(extraPhones).join(", ")}]`.trim();
  }
  if (extraEmails.size > 0) {
    mergedNotes = `${mergedNotes}\n[Additional Emails: ${Array.from(extraEmails).join(", ")}]`.trim();
  }

  await updateContact(params.targetContactId, params.ownerId, {
    phone: target.phone || source.phone || null,
    email: target.email || source.email || null,
    notes: mergedNotes || null,
  });

  // Repoint child students, leads, call logs, messages, appointments to targetContactId
  await _execDnsRunInternal(`UPDATE contacts SET parentContactId = ? WHERE parentContactId = ?`, [
    params.targetContactId,
    params.sourceContactId,
  ]);
  await _execDnsRunInternal(`UPDATE leads SET contactId = ? WHERE contactId = ?`, [
    params.targetContactId,
    params.sourceContactId,
  ]).catch(() => { });

  // Repoint any Do Not Serve entries referencing sourceContactId -> targetContactId (without losing original reason/stamps/notes)
  const sourceEntries = await _execDnsSelectInternal(
    `SELECT * FROM do_not_serve_entries
     WHERE owner_id = ? AND (linked_contact_id = ? OR household_anchor_id = ?)`,
    [params.ownerId, params.sourceContactId, params.sourceContactId]
  );

  let transferred = 0;
  for (const row of sourceEntries) {
    const entryId = Number(row.id);
    const nextLinked =
      Number(row.linked_contact_id) === params.sourceContactId
        ? params.targetContactId
        : row.linked_contact_id;
    const nextAnchor =
      Number(row.household_anchor_id) === params.sourceContactId
        ? params.targetContactId
        : row.household_anchor_id;

    await _execDnsRunInternal(
      `UPDATE do_not_serve_entries
       SET linked_contact_id = ?, household_anchor_id = ?, version = version + 1, updated_at = ?
       WHERE id = ? AND owner_id = ?`,
      [nextLinked, nextAnchor, new Date().toISOString(), entryId, params.ownerId]
    );

    // Keep source full name as an explicit alias if names differed
    const srcName = `${source.firstName || ""} ${source.lastName || ""}`.trim();
    const tgtName = `${target.firstName || ""} ${target.lastName || ""}`.trim();
    const normSrcName = normalizeFullNameForMatch(srcName);
    if (normSrcName && srcName.toLowerCase() !== tgtName.toLowerCase()) {
      await _execDnsRunInternal(
        `INSERT INTO do_not_serve_identifiers
          (entry_id, owner_id, identifier_type, raw_value, normalized_value, label, is_auto_synced, created_at, created_by_name)
         VALUES (?, ?, 'alias_name', ?, ?, 'Merged record name', 0, ?, ?)`,
        [entryId, params.ownerId, srcName, normSrcName, new Date().toISOString(), params.actor.actorName]
      );
    }

    await insertDoNotServeAuditDb({
      entryId,
      ownerId: params.ownerId,
      action: "contact_merged",
      summary: `Merged duplicate Contact #${params.sourceContactId} into Contact #${params.targetContactId}; restriction link and history preserved.`,
      previousValue: { linkedContactId: row.linked_contact_id, householdAnchorId: row.household_anchor_id },
      newValue: { linkedContactId: nextLinked, householdAnchorId: nextAnchor },
      targetEntityType: "contact",
      targetEntityId: String(params.targetContactId),
      actorUserId: params.actor.actorUserId,
      actorEmployeeId: params.actor.actorEmployeeId,
      actorName: params.actor.actorName,
    });
    transferred++;
  }

  await syncContactWithDoNotServe({
    contactId: params.targetContactId,
    ownerId: params.ownerId,
    actor: params.actor,
  });

  await deleteContact(params.sourceContactId, params.ownerId).catch(async () => {
    await _execDnsRunInternal(`DELETE FROM contacts WHERE id = ?`, [params.sourceContactId]);
    inMemoryContacts.delete(params.sourceContactId);
  });

  return { mergedContactId: params.targetContactId, transferredEntries: transferred };
}

export async function getActiveContactRestrictionMap(ownerId: number): Promise<
  Record<
    number,
    {
      entryId: number;
      appliesTo: DoNotServeScope;
      direct: boolean;
      displayName: string;
    }
  >
> {
  const activeRows = await getActiveDoNotServeIdentifiersDb(ownerId);
  const map: Record<
    number,
    { entryId: number; appliesTo: DoNotServeScope; direct: boolean; displayName: string }
  > = {};

  for (const r of activeRows) {
    if (r.identifierType === "contact_id") {
      const cId = Number(r.normalizedValue);
      if (cId > 0) {
        map[cId] = {
          entryId: r.entryId,
          appliesTo: r.appliesTo,
          direct: true,
          displayName: r.displayName,
        };
      }
    } else if (r.identifierType === "household_contact_id" && r.appliesTo === "household") {
      const cId = Number(r.normalizedValue);
      if (cId > 0 && !map[cId]?.direct) {
        map[cId] = {
          entryId: r.entryId,
          appliesTo: "household",
          direct: false,
          displayName: r.displayName,
        };
      }
    }
  }
  return map;
}
