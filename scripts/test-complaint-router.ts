import { appRouter } from '../server/routers';

async function main() {
  const caller = appRouter.createCaller({
    user: { id: "test-advocate", name: "Byron Honea", role: "admin" },
  } as any);

  console.log('--- Calling stateComplaint.listDrafts ---');
  const drafts = await caller.stateComplaint.listDrafts({});
  console.log(`listDrafts returned ${drafts.length} drafts:`);
  for (const d of drafts) {
    console.log(`- ID: ${d.id}, StudentId: ${d.studentId}, Title: ${d.title}, Updated: ${d.updatedAt}`);
  }

  console.log('\n--- Calling stateComplaint.getDraft({ studentId: 120042 }) ---');
  const brooklynDraft = await caller.stateComplaint.getDraft({ studentId: 120042 });
  console.log('Brooklyn draft found?', Boolean(brooklynDraft), 'length:', brooklynDraft?.length || 0);

  console.log('\n--- Calling stateComplaint.getDraft({ id: "draft_student_120042" }) ---');
  const brooklynDraftById = await caller.stateComplaint.getDraft({ id: "draft_student_120042" });
  console.log('Brooklyn draft by ID found?', Boolean(brooklynDraftById), 'length:', brooklynDraftById?.length || 0);
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
