import { queryCloudflareD1 } from "../server/_core/d1Client";

async function main() {
  console.log("=== SEARCHING file_blobs ===");
  try {
    const rows = await queryCloudflareD1(
      "SELECT key, mime_type, length(base64_data) as data_length, created_at FROM file_blobs WHERE length(base64_data) > 500 AND key NOT LIKE 'receipts/%' AND key NOT LIKE 'signatures/%' AND key NOT LIKE 'agreements/%'"
    );
    console.log(`Total non-receipt/sig/agreement blobs: ${rows.length}`);
    for (const row of rows) {
      console.log(JSON.stringify(row));
    }
  } catch (err) {
    console.error("Error querying file_blobs:", err);
  }
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
