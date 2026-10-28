import { getLocalDbClient } from "../server/_core/d1Client";

async function main() {
  const client = getLocalDbClient();
  console.log("\n=== file_blobs IN local.sqlite ===");
  try {
    const blobs = await client.execute("SELECT key, mime_type, length(base64_data) as len, created_at FROM file_blobs");
    for (const b of blobs.rows) {
      console.log(JSON.stringify(b));
    }
  } catch (e: any) {
    console.error("file_blobs error:", e.message);
  }

  console.log("\n=== iepDocuments IN local.sqlite ===");
  try {
    const docs = await client.execute("SELECT * FROM iepDocuments");
    for (const d of docs.rows) {
      console.log(JSON.stringify(d));
    }
  } catch (e: any) {
    console.error("iepDocuments error:", e.message);
  }
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
