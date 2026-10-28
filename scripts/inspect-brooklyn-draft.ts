import { getLocalDbClient } from "../server/_core/d1Client";

async function main() {
  const local = getLocalDbClient();
  const res = await local.execute("SELECT draft_json FROM complaint_drafts WHERE id = 'draft_student_120042'");
  if (res.rows?.[0]?.draft_json) {
    const data = JSON.parse(res.rows[0].draft_json as string);
    console.log("Draft title:", data.title);
    console.log("Student info:", data.studentInfo);
    console.log("Binders count:", data.binders?.length);
    console.log("Evidence files / exhibits:", JSON.stringify(data.binders?.map((b: any) => ({
      title: b.title,
      exhibits: b.exhibits?.map((e: any) => ({
        id: e.id,
        letter: e.letter,
        title: e.title,
        fileName: e.fileName,
        fileUrl: e.fileUrl,
        fileKey: e.fileKey,
      }))
    })), null, 2));
  }
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
