import { queryCloudflareD1 } from '../server/_core/d1Client';
import { createClient } from '@libsql/client';

async function main() {
  console.log("Checking draft_student_120042 in Cloudflare D1...");
  const rows = await queryCloudflareD1('SELECT id, student_id, title, draft_json FROM complaint_drafts WHERE id = "draft_student_120042"');
  if (!rows || rows.length === 0) {
    console.log("No draft found in Cloudflare D1.");
    return;
  }

  const draft = JSON.parse(rows[0].draft_json);
  console.log("Original draft title:", draft.title);
  console.log("Pages count:", draft.pages?.length);

  // Clean all pages
  draft.pages = (draft.pages || []).map((p: any) => {
    const updated = { ...p, isRenderingPdf: false };
    if (p.id === 'exhibit_a' || p.category === 'exhibit') {
      if (p.fileUrl && !p.pageCount) {
        updated.pageCount = 24;
      }
    }
    return updated;
  });

  const updatedJson = JSON.stringify(draft);

  // 1. Update Cloudflare D1
  console.log("Updating Cloudflare D1...");
  await queryCloudflareD1(
    'UPDATE complaint_drafts SET draft_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = "draft_student_120042"',
    [updatedJson]
  );
  console.log("✓ Cloudflare D1 updated successfully.");

  // 2. Update local.sqlite
  console.log("Updating local.sqlite...");
  try {
    const local = createClient({ url: 'file:local.sqlite' });
    await local.execute({
      sql: 'UPDATE complaint_drafts SET draft_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [updatedJson, 'draft_student_120042'],
    });
    console.log("✓ local.sqlite updated successfully.");
  } catch (err: any) {
    console.warn("local.sqlite update note:", err?.message);
  }

  console.log("Repair completed!");
}

main().then(() => process.exit(0)).catch(err => {
  console.error("Error in repair:", err);
  process.exit(1);
});
