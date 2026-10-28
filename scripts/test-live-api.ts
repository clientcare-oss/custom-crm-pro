async function main() {
  console.log("Fetching live contacts...");
  const res = await fetch("https://custom-crm-pro.clientcare-fa6.workers.dev/api/trpc/contacts.list");
  const json = await res.json();
  const contacts = json?.result?.data?.json || json?.result?.data || [];
  console.log("Total contacts count:", contacts.length);
  const shanderious = contacts.find((c: any) => (c.firstName || "").toLowerCase().includes("shanderious"));
  console.log("Shanderious in live contacts.list:", shanderious);

  const tiana = contacts.find((c: any) => (c.firstName || "").toLowerCase().includes("tiana"));
  console.log("Tiana in live contacts.list:", tiana);

  console.log("Fetching meeting workspace getOrCreate for student 120036...");
  const mwRes = await fetch("https://custom-crm-pro.clientcare-fa6.workers.dev/api/trpc/meetingWorkspace.getOrCreate?input=" + encodeURIComponent(JSON.stringify({ json: { studentContactId: 120036 } })));
  const mwText = await mwRes.text();
  console.log("Status:", mwRes.status, "Response:", mwText.slice(0, 500));
}

main().catch(console.error);
