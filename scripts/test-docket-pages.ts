import { queryCloudflareD1 } from '../server/_core/d1Client';
import { getDocketTotalPages, getBinderPageRange } from '../client/src/pages/complaint/ComplaintWorkspace';

async function main() {
  const rows = await queryCloudflareD1('SELECT draft_json FROM complaint_drafts WHERE id = "draft_student_120042"');
  const draft = JSON.parse(rows[0].draft_json);
  const totalDocketPages = getDocketTotalPages(draft.pages, draft.caseDetails);
  console.log('Total Docket Pages:', totalDocketPages);

  for (let i = 0; i < draft.pages.length; i++) {
    const range = getBinderPageRange(i, draft.pages, draft.caseDetails);
    console.log(`[Binder ${i+1}] ${draft.pages[i].title} -> Pages: ${range.badge} (Cover: ${range.coverPage}, Content: ${range.contentPage})`);
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
