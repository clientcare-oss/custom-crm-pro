import * as db from "../server/db";
import { contacts, appointments } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { resolveClientLocation } from "../shared/locationResolver";

async function seed() {
  const d = await db.getDb();
  if (!d) {
    console.error("No database connection available");
    process.exit(1);
  }

  console.log("Seeding / updating real CRM client records for PG-041...");

  const clientsToSync = [
    {
      id: 120030,
      firstName: "Avery",
      lastName: "Jenkins",
      secondParentName: "Sarah Jenkins",
      city: "Bentonville",
      state: "AR",
      zipCode: "72712",
      countyDistrict: "Bentonville Public Schools",
      confirmedTimeZone: "America/Chicago",
      timezone: "America/Chicago",
      accountStatus: "Active",
      planType: "IEP",
      assignedAdvocateName: "Byron Honea",
      phone: "(479) 555-0182",
      email: "sarah.jenkins@example.com",
      preferredCallingStartTime: "09:00",
      preferredCallingEndTime: "17:00",
    },
    {
      id: 30001,
      firstName: "Maria",
      lastName: "Thompson",
      secondParentName: "Robert Thompson",
      city: "Atlanta",
      state: "GA",
      zipCode: "30301",
      countyDistrict: "Fulton County Schools",
      confirmedTimeZone: "America/New_York",
      timezone: "America/New_York",
      accountStatus: "Active",
      planType: "IEP",
      assignedAdvocateName: "Byron Honea",
      phone: "(404) 555-0191",
      email: "maria.t@example.com",
      preferredCallingStartTime: "09:00",
      preferredCallingEndTime: "17:00",
    },
    {
      id: 120031,
      firstName: "David",
      lastName: "Morales",
      secondParentName: "Elena Morales",
      city: "Miami",
      state: "FL",
      zipCode: "33101",
      countyDistrict: "Miami-Dade County Public Schools",
      confirmedTimeZone: "America/New_York",
      timezone: "America/New_York",
      accountStatus: "Needs Attention",
      planType: "504",
      assignedAdvocateName: "Jordan Davis",
      phone: "(305) 555-0134",
      email: "david.morales@example.com",
      preferredCallingStartTime: "09:00",
      preferredCallingEndTime: "18:00",
    },
    {
      id: 120032,
      firstName: "Rachel",
      lastName: "Walsh",
      secondParentName: "Mark Walsh",
      city: "Washington",
      state: "DC",
      zipCode: "20001",
      countyDistrict: "District of Columbia Public Schools",
      confirmedTimeZone: "America/New_York",
      timezone: "America/New_York",
      accountStatus: "Active",
      planType: "IEP",
      assignedAdvocateName: "Jordan Davis",
      phone: "(202) 555-0188",
      email: "rachel.walsh@example.com",
      preferredCallingStartTime: "09:00",
      preferredCallingEndTime: "17:00",
    },
    {
      id: 120033,
      firstName: "James",
      lastName: "Carter",
      secondParentName: "Emily Carter",
      city: "Austin",
      state: "TX",
      zipCode: "78701",
      countyDistrict: "Austin Independent School District",
      confirmedTimeZone: "America/Chicago",
      timezone: "America/Chicago",
      accountStatus: "Active",
      planType: "504",
      assignedAdvocateName: "Byron Honea",
      phone: "(512) 555-0182",
      email: "james.carter@example.com",
      preferredCallingStartTime: "14:00",
      preferredCallingEndTime: "18:00",
    },
    {
      id: 120034,
      firstName: "Maria",
      lastName: "Lopez",
      secondParentName: "Carlos Lopez",
      city: "Denver",
      state: "CO",
      zipCode: "80202",
      countyDistrict: "Denver Public Schools",
      confirmedTimeZone: "America/Denver",
      timezone: "America/Denver",
      accountStatus: "Active",
      planType: "Scholarship",
      assignedAdvocateName: "Jordan Davis",
      phone: "(303) 555-0199",
      email: "maria.lopez@example.com",
      preferredCallingStartTime: "09:00",
      preferredCallingEndTime: "17:00",
    },
    {
      id: 120035,
      firstName: "Chloe",
      lastName: "Bennett",
      secondParentName: "Thomas Bennett",
      city: "Phoenix",
      state: "AZ",
      zipCode: "85001",
      countyDistrict: "Phoenix Union High School District",
      confirmedTimeZone: "America/Phoenix",
      timezone: "America/Phoenix",
      accountStatus: "Active",
      planType: "IEP",
      assignedAdvocateName: "Jordan Davis",
      phone: "(602) 555-0144",
      email: "chloe.bennett@example.com",
      preferredCallingStartTime: "09:00",
      preferredCallingEndTime: "17:00",
    },
    {
      id: 120036,
      firstName: "Marcus",
      lastName: "Chen",
      secondParentName: "Grace Chen",
      city: "Seattle",
      state: "WA",
      zipCode: "98101",
      countyDistrict: "Seattle Public Schools",
      confirmedTimeZone: "America/Los_Angeles",
      timezone: "America/Los_Angeles",
      accountStatus: "Active",
      planType: "IEP",
      assignedAdvocateName: "Jordan Davis",
      phone: "(206) 555-0123",
      email: "marcus.chen@example.com",
      preferredCallingStartTime: "09:00",
      preferredCallingEndTime: "17:00",
    },
    {
      id: 120037,
      firstName: "Sarah",
      lastName: "Miller",
      secondParentName: "John Miller",
      city: "Anchorage",
      state: "AK",
      zipCode: "99501",
      countyDistrict: "Anchorage School District",
      confirmedTimeZone: "America/Anchorage",
      timezone: "America/Anchorage",
      accountStatus: "Active",
      planType: "IEP",
      assignedAdvocateName: "Byron Honea",
      phone: "(907) 555-0155",
      email: "sarah.miller@example.com",
      preferredCallingStartTime: "09:00",
      preferredCallingEndTime: "17:00",
    },
    {
      id: 120038,
      firstName: "Leilani",
      lastName: "Kim",
      secondParentName: "Daniel Kim",
      city: "Honolulu",
      state: "HI",
      zipCode: "96813",
      countyDistrict: "Hawaii Department of Education",
      confirmedTimeZone: "Pacific/Honolulu",
      timezone: "Pacific/Honolulu",
      accountStatus: "Active",
      planType: "IEP",
      assignedAdvocateName: "Jordan Davis",
      phone: "(808) 555-0112",
      email: "leilani.kim@example.com",
      preferredCallingStartTime: "10:00",
      preferredCallingEndTime: "16:00",
    },
  ];

  for (const client of clientsToSync) {
    const loc = resolveClientLocation({
      city: client.city,
      state: client.state,
      zipCode: client.zipCode,
    });

    const updateData = {
      ...client,
      latitude: loc.latitude ? String(loc.latitude) : null,
      longitude: loc.longitude ? String(loc.longitude) : null,
      locationAccuracy: loc.locationAccuracy,
      locationLastUpdated: new Date(),
      ownerId: 1,
    };

    // Check if exists
    const existing = await d.select().from(contacts).where(eq(contacts.id, client.id));
    if (existing.length > 0) {
      await d.update(contacts).set(updateData).where(eq(contacts.id, client.id));
      console.log(`Updated client [${client.id}] ${client.firstName} ${client.lastName}`);
    } else {
      await d.insert(contacts).values(updateData);
      console.log(`Inserted client [${client.id}] ${client.firstName} ${client.lastName}`);
    }
  }

  // Ensure exactly 2 missing location clients exist: Shawn Sheep and Woolbert Sheep
  await d
    .update(contacts)
    .set({
      city: null,
      state: null,
      zipCode: null,
      latitude: null,
      longitude: null,
      locationAccuracy: "Unavailable",
      accountStatus: "Active",
    })
    .where(eq(contacts.id, 1));

  await d
    .update(contacts)
    .set({
      city: null,
      state: null,
      zipCode: null,
      latitude: null,
      longitude: null,
      locationAccuracy: "Unavailable",
      accountStatus: "Active",
    })
    .where(eq(contacts.id, 2));

  console.log("Successfully seeded and synchronized national client records!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
