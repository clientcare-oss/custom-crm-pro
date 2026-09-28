import { queryCloudflareD1 } from '../server/_core/d1Client';

async function seedPackages() {
  console.log("Checking and syncing advocacy packages in services table...");

  const packages = [
    {
      code: "anchor",
      name: "Anchor Advocacy Package",
      title: "⚓ Anchor Advocacy Package",
      desc: "Premium comprehensive executive advocacy with unlimited IEP and 504 representation, state complaints, and records audit.",
      price: 10500, // $105/mo in cents
      folderId: 1, // Advocacy Memberships
      icon: "award",
      accentColor: "blue",
    },
    {
      code: "navigator",
      name: "Navigator Advocacy Package",
      title: "🧭 Navigator Advocacy Package",
      desc: "Guided core advocacy package with essential meeting representation, advocate sessions, and document audits.",
      price: 7500, // $75/mo in cents
      folderId: 1,
      icon: "compass",
      accentColor: "sky",
    },
    {
      code: "family",
      name: "Family Advocacy Package",
      title: "👨‍👩‍👧‍👦 Family Advocacy Package",
      desc: "Full family package with comprehensive IEP coverage, dedicated email support, and student advocacy review.",
      price: 15000, // $150/mo in cents
      folderId: 1,
      icon: "users",
      accentColor: "indigo",
    },
  ];

  for (const pkg of packages) {
    const existing = await queryCloudflareD1(
      "SELECT id, serviceCode, name FROM services WHERE LOWER(serviceCode) = ? OR LOWER(name) LIKE ? LIMIT 1;",
      [pkg.code, `%${pkg.code}%`]
    );

    if (existing && existing.length > 0) {
      console.log(`Package ${pkg.code} already exists as ID ${existing[0].id}, updating to ensure advocacy package flags...`);
      await queryCloudflareD1(
        "UPDATE services SET isAdvocacyPackage = 1, folderId = ?, standardPrice = ?, price = ?, billingType = 'recurring', billingInterval = 'monthly', allowancesLocked = 1 WHERE id = ?;",
        [pkg.folderId, pkg.price, pkg.price, existing[0].id]
      );
    } else {
      console.log(`Inserting new package ${pkg.code}...`);
      await queryCloudflareD1(
        `INSERT INTO services (
          organizationId, ownerId, folderId, serviceCode, internalName, clientFacingTitle, name,
          shortDescription, fullDescription, standardPrice, price, currency, billingType, billingInterval,
          customPriceAllowed, isActive, isArchived, availableInDiscoveryCall, availableInParentPortal,
          availableInSupportOfferPanel, availableAsStandalone, availableAsAddOn, isAdvocacyPackage, allowancesLocked,
          icon, accentColor, createdBy, updatedBy
        ) VALUES (
          1, 1, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, 'usd', 'recurring', 'monthly',
          1, 1, 0, 1, 1,
          1, 1, 0, 1, 1,
          ?, ?, 'System', 'System'
        );`,
        [pkg.folderId, pkg.code, pkg.name, pkg.title, pkg.name, pkg.desc, pkg.desc, pkg.price, pkg.price, pkg.icon, pkg.accentColor]
      );
    }
  }

  // Also ensure advocacy_plan_55 is marked as isAdvocacyPackage = 1
  await queryCloudflareD1("UPDATE services SET isAdvocacyPackage = 1, allowancesLocked = 1 WHERE serviceCode IN ('advocacy_plan_55', 'advocacy_plan_105');");

  console.log("Advocacy packages successfully synced!");
}

seedPackages().catch(err => {
  console.error("Sync error:", err);
  process.exit(1);
});
