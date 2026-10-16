import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";

describe("Business Settings & Contact Consolidation (PG-024-BIZ)", () => {
  const adminCtx: any = {
    user: {
      id: 1,
      openId: "admin-owner-test",
      name: "Byron Honea",
      email: "advocate@waypointadvocates.com",
      role: "admin",
    },
  };

  const caller = appRouter.createCaller(adminCtx);

  it("retrieves the consolidated business profile with defaults", async () => {
    const profile = await caller.system.getBusinessProfile();

    expect(profile).toBeDefined();
    expect(profile.companyName).toBeTruthy();
    expect(profile.phone).toBeTruthy();
    expect(profile.email).toBeTruthy();
    expect(profile.address).toBeTruthy();
    expect(profile.website).toBeTruthy();
    expect(profile.leadAdvocate).toBe("Byron Honea");
  });

  it("updates consolidated business settings and synchronizes across modules", async () => {
    const res = await caller.system.updateBusinessProfile({
      companyName: "Waypoint Advocates",
      receiptDisplayName: "WAYPOINT ADVOCATES",
      phone: "(404) 919-8664",
      email: "clientcare@waypointadvocates.com",
      replyToEmail: "billing@waypointadvocates.com",
      street: "PO Box 724944",
      city: "Atlanta",
      state: "GA",
      zip: "31139",
      country: "United States",
      website: "https://waypointadvocates.com",
      supportContactInfo: "Questions? Reach out to clientcare@waypointadvocates.com",
      showBusinessAddress: true,
    });

    expect(res.success).toBe(true);
    expect(res.address).toContain("PO Box 724944, Atlanta, GA 31139");
    expect(res.phone).toBe("(404) 919-8664");

    // Verify getBusinessProfile reflects the update
    const updatedProfile = await caller.system.getBusinessProfile();
    expect(updatedProfile.phone).toBe("(404) 919-8664");
    expect(updatedProfile.email).toBe("clientcare@waypointadvocates.com");
    expect(updatedProfile.replyToEmail).toBe("billing@waypointadvocates.com");
    expect(updatedProfile.address).toContain("PO Box 724944");
    expect(updatedProfile.city).toBe("Atlanta");
    expect(updatedProfile.state).toBe("GA");
    expect(updatedProfile.zip).toBe("31139");

    // Verify getBusinessPhone is synchronized
    const phoneData = await caller.system.getBusinessPhone();
    expect(phoneData.phone).toBe("(404) 919-8664");
  });

  it("assembles address components when single-line address is omitted", async () => {
    const res = await caller.system.updateBusinessProfile({
      street: "100 Peachtree St NW Ste 500",
      city: "Atlanta",
      state: "GA",
      zip: "30303",
    });

    expect(res.success).toBe(true);
    expect(res.address).toBe("100 Peachtree St NW Ste 500, Atlanta, GA 30303");

    const profile = await caller.system.getBusinessProfile();
    expect(profile.address).toBe("100 Peachtree St NW Ste 500, Atlanta, GA 30303");
  });
});
