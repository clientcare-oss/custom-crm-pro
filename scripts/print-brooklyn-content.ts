import { queryCloudflareD1 } from '../server/_core/d1Client';

async function main() {
  const rows = await queryCloudflareD1('SELECT draft_json FROM complaint_drafts WHERE id = "draft_student_120042"');
  const draft = JSON.parse(rows[0].draft_json);

  console.log('=== EXHIBIT INDEX (PAGE 4 / BINDER 04) ===');
  console.log(draft.pages[3]?.content);

  console.log('\n=== CLARITY CONTROL (PAGE 2 / BINDER 02) ===');
  console.log(draft.pages[1]?.content);

  console.log('\n=== CHRONOLOGICAL SUMMARY (PAGE 3 / BINDER 03) ===');
  console.log(draft.pages[2]?.content);

  console.log('\n=== ALL PAGE DETAILS ===');
  for (const p of draft.pages) {
    console.log(`Page ID: ${p.id}, Title: "${p.title}", RenderedPages: ${p.renderedPages?.length || 0}, File: ${p.fileName || p.fileUrl || 'none'}`);
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
