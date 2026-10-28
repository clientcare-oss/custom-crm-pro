import { queryCloudflareD1 } from '../server/_core/d1Client';

async function main() {
  const rows = await queryCloudflareD1('SELECT draft_json FROM complaint_drafts WHERE id = "draft_student_120042"');
  if (rows && rows.length > 0) {
    const draft = JSON.parse(rows[0].draft_json);
    console.log('Title:', draft.title);
    console.log('Pages count in array:', draft.pages?.length);
    console.log('Page objects:');
    for (let i = 0; i < (draft.pages || []).length; i++) {
      const p = draft.pages[i];
      console.log(`[${i}] ID: ${p.id}, Title: "${p.title}", Category: ${p.category}, fileUrl: ${p.fileUrl}, fileName: ${p.fileName}, isRenderingPdf: ${p.isRenderingPdf}, renderedPages: ${p.renderedPages?.length}, pageCount: ${p.pageCount}`);
    }
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
