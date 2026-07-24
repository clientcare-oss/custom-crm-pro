import { and, asc, desc, eq, max } from "drizzle-orm";
import {
  aiSuggestionRecords, allegations, complaintCases, draftBlocks, evidenceItems,
  evidenceLinks, extractedFacts, legalAuthorities, requestedRemedies, storyAnswers,
  studentImpacts, timelineEvents,
} from "../drizzle/schema";
import { getDb } from "./db";

async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

// ---------- Complaint cases ----------
export async function listCases() {
  return (await db()).select().from(complaintCases).orderBy(desc(complaintCases.updatedAt));
}

export async function getCase(id: number) {
  const rows = await (await db()).select().from(complaintCases).where(eq(complaintCases.id, id)).limit(1);
  return rows[0];
}

export async function createCase(values: typeof complaintCases.$inferInsert) {
  const d = await db();
  const [res] = await d.insert(complaintCases).values(values);
  return res.insertId;
}

export async function updateCase(id: number, values: Partial<typeof complaintCases.$inferInsert>) {
  await (await db()).update(complaintCases).set(values).where(eq(complaintCases.id, id));
}

export async function nextCaseIdNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const rows = await (await db()).select({ id: complaintCases.id }).from(complaintCases);
  const n = rows.length + 1;
  return `GA-${year}-${String(n).padStart(4, "0")}`;
}

// ---------- Story answers ----------
export async function listStoryAnswers(caseId: number) {
  return (await db()).select().from(storyAnswers).where(eq(storyAnswers.caseId, caseId));
}

export async function upsertStoryAnswer(caseId: number, promptKey: string, answerText: string) {
  const d = await db();
  const existing = await d.select().from(storyAnswers)
    .where(and(eq(storyAnswers.caseId, caseId), eq(storyAnswers.promptKey, promptKey))).limit(1);
  if (existing[0]) {
    await d.update(storyAnswers).set({ answerText }).where(eq(storyAnswers.id, existing[0].id));
    return existing[0].id;
  }
  const [res] = await d.insert(storyAnswers).values({ caseId, promptKey, answerText });
  return res.insertId;
}

// ---------- Extracted facts ----------
export async function listFacts(caseId: number) {
  return (await db()).select().from(extractedFacts).where(eq(extractedFacts.caseId, caseId)).orderBy(asc(extractedFacts.id));
}

export async function insertFacts(rows: (typeof extractedFacts.$inferInsert)[]) {
  if (!rows.length) return;
  await (await db()).insert(extractedFacts).values(rows);
}

export async function setFactStatus(id: number, status: "unconfirmed" | "confirmed" | "rejected") {
  await (await db()).update(extractedFacts).set({ status }).where(eq(extractedFacts.id, id));
}

export async function clearUnconfirmedFacts(caseId: number, sourcePrompt: string) {
  await (await db()).delete(extractedFacts)
    .where(and(eq(extractedFacts.caseId, caseId), eq(extractedFacts.sourcePrompt, sourcePrompt), eq(extractedFacts.status, "unconfirmed")));
}

// ---------- Timeline ----------
export async function listTimeline(caseId: number) {
  return (await db()).select().from(timelineEvents).where(eq(timelineEvents.caseId, caseId))
    .orderBy(asc(timelineEvents.eventDate), asc(timelineEvents.sortOrder));
}

export async function createTimelineEvent(values: typeof timelineEvents.$inferInsert) {
  const [res] = await (await db()).insert(timelineEvents).values(values);
  return res.insertId;
}

export async function updateTimelineEvent(id: number, values: Partial<typeof timelineEvents.$inferInsert>) {
  await (await db()).update(timelineEvents).set(values).where(eq(timelineEvents.id, id));
}

export async function deleteTimelineEvent(id: number) {
  await (await db()).delete(timelineEvents).where(eq(timelineEvents.id, id));
}

// ---------- Allegations ----------
export async function listAllegations(caseId: number) {
  return (await db()).select().from(allegations).where(eq(allegations.caseId, caseId))
    .orderBy(asc(allegations.sortOrder), asc(allegations.seqNumber));
}

export async function getAllegation(id: number) {
  const rows = await (await db()).select().from(allegations).where(eq(allegations.id, id)).limit(1);
  return rows[0];
}

export async function nextAllegationSeq(caseId: number): Promise<number> {
  const rows = await (await db()).select({ m: max(allegations.seqNumber) }).from(allegations).where(eq(allegations.caseId, caseId));
  return (rows[0]?.m ?? 0) + 1;
}

export async function createAllegation(values: typeof allegations.$inferInsert) {
  const [res] = await (await db()).insert(allegations).values(values);
  return res.insertId;
}

export async function updateAllegation(id: number, values: Partial<typeof allegations.$inferInsert>) {
  await (await db()).update(allegations).set(values).where(eq(allegations.id, id));
}

export async function deleteAllegation(id: number) {
  const d = await db();
  await d.delete(allegations).where(eq(allegations.id, id));
  await d.delete(legalAuthorities).where(eq(legalAuthorities.allegationId, id));
  await d.delete(evidenceLinks).where(and(eq(evidenceLinks.targetType, "allegation"), eq(evidenceLinks.targetId, id)));
}

// ---------- Legal authorities ----------
export async function listAuthorities(allegationId: number) {
  return (await db()).select().from(legalAuthorities).where(eq(legalAuthorities.allegationId, allegationId));
}

export async function listAuthoritiesForCase(allegationIds: number[]) {
  if (!allegationIds.length) return [];
  const d = await db();
  const all = await d.select().from(legalAuthorities);
  return all.filter(a => allegationIds.includes(a.allegationId));
}

export async function insertAuthorities(rows: (typeof legalAuthorities.$inferInsert)[]) {
  if (!rows.length) return;
  await (await db()).insert(legalAuthorities).values(rows);
}

export async function updateAuthority(id: number, values: Partial<typeof legalAuthorities.$inferInsert>) {
  await (await db()).update(legalAuthorities).set(values).where(eq(legalAuthorities.id, id));
}

export async function deleteAuthority(id: number) {
  await (await db()).delete(legalAuthorities).where(eq(legalAuthorities.id, id));
}

// ---------- Evidence ----------
export async function listEvidence(caseId: number) {
  return (await db()).select().from(evidenceItems).where(eq(evidenceItems.caseId, caseId)).orderBy(desc(evidenceItems.createdAt));
}

export async function getEvidence(id: number) {
  const rows = await (await db()).select().from(evidenceItems).where(eq(evidenceItems.id, id)).limit(1);
  return rows[0];
}

export async function nextEvidenceId(caseId: number): Promise<string> {
  const rows = await (await db()).select({ id: evidenceItems.id }).from(evidenceItems).where(eq(evidenceItems.caseId, caseId));
  return `EV-${String(rows.length + 1).padStart(4, "0")}`;
}

export async function createEvidence(values: typeof evidenceItems.$inferInsert) {
  const [res] = await (await db()).insert(evidenceItems).values(values);
  return res.insertId;
}

export async function updateEvidence(id: number, values: Partial<typeof evidenceItems.$inferInsert>) {
  // evidenceId is immutable — never allow it through updates
  const { evidenceId: _ignored, ...safe } = values as Record<string, unknown> & { evidenceId?: string };
  await (await db()).update(evidenceItems).set(safe).where(eq(evidenceItems.id, id));
}

export async function deleteEvidence(id: number) {
  const d = await db();
  await d.delete(evidenceItems).where(eq(evidenceItems.id, id));
  await d.delete(evidenceLinks).where(eq(evidenceLinks.evidenceItemId, id));
}

export async function listEvidenceLinks(evidenceItemId: number) {
  return (await db()).select().from(evidenceLinks).where(eq(evidenceLinks.evidenceItemId, evidenceItemId));
}

export async function listLinksForTarget(targetType: "allegation" | "timeline_event", targetId: number) {
  return (await db()).select().from(evidenceLinks)
    .where(and(eq(evidenceLinks.targetType, targetType), eq(evidenceLinks.targetId, targetId)));
}

export async function listAllLinksForCase(caseId: number) {
  const d = await db();
  const items = await listEvidence(caseId);
  const ids = items.map(i => i.id);
  if (!ids.length) return [];
  const all = await d.select().from(evidenceLinks);
  return all.filter(l => ids.includes(l.evidenceItemId));
}

export async function createEvidenceLink(values: typeof evidenceLinks.$inferInsert) {
  const [res] = await (await db()).insert(evidenceLinks).values(values);
  return res.insertId;
}

export async function deleteEvidenceLink(id: number) {
  await (await db()).delete(evidenceLinks).where(eq(evidenceLinks.id, id));
}

// ---------- Student impacts ----------
export async function listImpacts(caseId: number) {
  return (await db()).select().from(studentImpacts).where(eq(studentImpacts.caseId, caseId)).orderBy(asc(studentImpacts.id));
}

export async function createImpact(values: typeof studentImpacts.$inferInsert) {
  const [res] = await (await db()).insert(studentImpacts).values(values);
  return res.insertId;
}

export async function updateImpact(id: number, values: Partial<typeof studentImpacts.$inferInsert>) {
  await (await db()).update(studentImpacts).set(values).where(eq(studentImpacts.id, id));
}

export async function deleteImpact(id: number) {
  await (await db()).delete(studentImpacts).where(eq(studentImpacts.id, id));
}

// ---------- Remedies ----------
export async function listRemedies(caseId: number) {
  return (await db()).select().from(requestedRemedies).where(eq(requestedRemedies.caseId, caseId))
    .orderBy(asc(requestedRemedies.sortOrder), asc(requestedRemedies.id));
}

export async function createRemedy(values: typeof requestedRemedies.$inferInsert) {
  const [res] = await (await db()).insert(requestedRemedies).values(values);
  return res.insertId;
}

export async function updateRemedy(id: number, values: Partial<typeof requestedRemedies.$inferInsert>) {
  await (await db()).update(requestedRemedies).set(values).where(eq(requestedRemedies.id, id));
}

export async function deleteRemedy(id: number) {
  await (await db()).delete(requestedRemedies).where(eq(requestedRemedies.id, id));
}

// ---------- Draft blocks ----------
export async function listDraftBlocks(caseId: number) {
  return (await db()).select().from(draftBlocks).where(eq(draftBlocks.caseId, caseId)).orderBy(asc(draftBlocks.id));
}

export async function upsertDraftBlock(
  caseId: number, sectionKey: string, allegationId: number | null,
  values: Partial<typeof draftBlocks.$inferInsert>,
) {
  const d = await db();
  const rows = await d.select().from(draftBlocks)
    .where(and(eq(draftBlocks.caseId, caseId), eq(draftBlocks.sectionKey, sectionKey)));
  const existing = rows.find(r => (r.allegationId ?? null) === (allegationId ?? null));
  if (existing) {
    await d.update(draftBlocks).set({ ...values, version: existing.version + 1 }).where(eq(draftBlocks.id, existing.id));
    return existing.id;
  }
  const [res] = await d.insert(draftBlocks).values({ caseId, sectionKey, allegationId, ...values });
  return res.insertId;
}

// ---------- AI audit records ----------
export async function recordAi(values: typeof aiSuggestionRecords.$inferInsert) {
  await (await db()).insert(aiSuggestionRecords).values(values);
}

export async function listAiRecords(caseId: number) {
  return (await db()).select().from(aiSuggestionRecords).where(eq(aiSuggestionRecords.caseId, caseId)).orderBy(desc(aiSuggestionRecords.id));
}
