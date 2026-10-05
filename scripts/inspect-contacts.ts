import { queryCloudflareD1, getLocalDbClient } from '../server/_core/d1Client';

async function main() {
  const local = getLocalDbClient();
  const res = await local.execute({
    sql: "SELECT id, firstName, lastName, jobTitle, schoolName, gradeLevel, planType, parentContactId, pipelineStage, accountStatus FROM contacts ORDER BY id DESC LIMIT 15",
    args: []
  });
  console.log("Recent contacts in local SQLite:", JSON.stringify(res.rows, null, 2));

  try {
    const d1Res = await queryCloudflareD1("SELECT id, firstName, lastName, jobTitle, schoolName, gradeLevel, planType, parentContactId, pipelineStage, accountStatus FROM contacts ORDER BY id DESC LIMIT 15");
    console.log("Recent contacts in D1:", JSON.stringify(d1Res, null, 2));
  } catch (err: any) {
    console.log("D1 query error:", err.message);
  }
}

main().catch(console.error);
