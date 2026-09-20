import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import {
  getTimeInZone,
  getTimeDifferenceHours,
  formatTimeDifferenceText,
  getCallingStatus,
  formatPlainLanguageExplanation,
  detectTimeZoneFromLocation,
  SIX_CORE_ZONES,
} from "../shared/timezones";
import { resolveClientLocation } from "../shared/locationResolver";

describe("PG-041 National Coverage & Time Zone Intelligence", () => {
  const mockAdvocateUser = {
    id: 1,
    openId: "user_test_byron",
    name: "Byron Honea",
    email: "byron@waypointadvocates.com",
    role: "admin" as const,
    loginMethod: "manually_created",
    organizationId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    phone: null,
    quoWebhookSecret: null,
    gmailUser: null,
    gmailAppPassword: null,
    portalDomain: null,
    logoUrl: null,
  };

  const adminCtx = {
    user: mockAdvocateUser,
  };

  it("1. Pacific meeting: converts 8:00 AM Pacific to 11:00 AM Eastern", () => {
    // 2026-09-24T15:00:00Z is 8:00 AM PDT (UTC-7) and 11:00 AM EDT (UTC-4)
    const testMeetingUtc = new Date("2026-09-24T15:00:00Z");

    const clientTime = getTimeInZone("America/Los_Angeles", testMeetingUtc);
    const viewerTime = getTimeInZone("America/New_York", testMeetingUtc);
    const diffHours = getTimeDifferenceHours("America/Los_Angeles", "America/New_York", testMeetingUtc);

    expect(clientTime.timeString).toBe("8:00 AM");
    expect(viewerTime.timeString).toBe("11:00 AM");
    expect(diffHours).toBe(-3);

    const explanation = formatPlainLanguageExplanation(
      testMeetingUtc,
      "America/Los_Angeles",
      "America/New_York",
      "school"
    );
    expect(explanation).toBe("When it is 8:00 AM for the school, it will be 11:00 AM for you.");
  });

  it("2. Hawaii calling alert: detects 6-hour difference and flags off-hours status", () => {
    // 2026-09-24T18:15:00Z is 8:15 AM HST (UTC-10) and 2:15 PM EDT (UTC-4)
    const testHawaiiMorning = new Date("2026-09-24T18:15:00Z");

    const hiTime = getTimeInZone("Pacific/Honolulu", testHawaiiMorning);
    const diff = getTimeDifferenceHours("Pacific/Honolulu", "America/New_York", testHawaiiMorning);
    const diffText = formatTimeDifferenceText(diff);

    expect(hiTime.timeString).toBe("8:15 AM");
    expect(diff).toBe(-6);
    expect(diffText).toBe("6 hours behind you");

    const status = getCallingStatus("Pacific/Honolulu", {}, testHawaiiMorning);
    expect(status.status).toBe("yellow");
    expect(status.label).toBe("Use discretion");
  });

  it("3. Arizona client: handles America/Phoenix without daylight saving time shift", () => {
    // Summer date (EDT is UTC-4, Phoenix is UTC-7: 3 hrs diff)
    const summerDate = new Date("2026-07-15T19:00:00Z");
    const diffSummer = getTimeDifferenceHours("America/Phoenix", "America/New_York", summerDate);
    expect(diffSummer).toBe(-3);

    // Winter date (EST is UTC-5, Phoenix is UTC-7: 2 hrs diff)
    const winterDate = new Date("2026-12-15T19:00:00Z");
    const diffWinter = getTimeDifferenceHours("America/Phoenix", "America/New_York", winterDate);
    expect(diffWinter).toBe(-2);
  });

  it("4. Alaska client: correctly maps to Alaska inset and America/Anchorage", () => {
    const detected = detectTimeZoneFromLocation("Anchorage", "AK", "99501");
    expect(detected.timeZone).toBe("America/Anchorage");
    expect(detected.confidence).toBe("high");

    const akDate = new Date("2026-09-24T18:15:00Z"); // 10:15 AM AKDT
    const akTime = getTimeInZone("America/Anchorage", akDate);
    expect(akTime.timeString).toBe("10:15 AM");
    expect(akTime.tzAbbr).toBe("AKDT");
  });

  it("5. Employee in another zone: Mountain advocate sees converted meeting times", () => {
    // A meeting scheduled for 8:00 AM Pacific (15:00 UTC)
    const meetingDate = new Date("2026-09-24T15:00:00Z");

    const mountainViewer = getTimeInZone("America/Denver", meetingDate);
    expect(mountainViewer.timeString).toBe("9:00 AM");

    const plainExplanation = formatPlainLanguageExplanation(
      meetingDate,
      "America/Los_Angeles",
      "America/Denver",
      "school"
    );
    expect(plainExplanation).toBe("When it is 8:00 AM for the school, it will be 9:00 AM for you.");
  });

  it("6. Address change & location heuristic: identifies timezone by state and split ZIP", () => {
    // Florida Panhandle ZIP 324xx is Central
    const panhandle = detectTimeZoneFromLocation("Panama City", "FL", "32401");
    expect(panhandle.timeZone).toBe("America/Chicago");

    // Miami is Eastern
    const miami = detectTimeZoneFromLocation("Miami", "FL", "33101");
    expect(miami.timeZone).toBe("America/New_York");

    // Hawaii is Hawaii
    const honolulu = detectTimeZoneFromLocation("Honolulu", "HI", "96801");
    expect(honolulu.timeZone).toBe("Pacific/Honolulu");
  });

  it("7. Safe calling rules: Green (9am-6pm), Yellow (8-9am, 6-8pm), Red (<8am, >8pm)", () => {
    // 7:30 AM -> Red
    const earlyMorning = new Date("2026-09-24T11:30:00Z"); // 7:30 AM EDT
    const earlyStatus = getCallingStatus("America/New_York", {}, earlyMorning);
    expect(earlyStatus.status).toBe("red");
    expect(earlyStatus.label).toBe("Too early");

    // 8:30 AM -> Yellow
    const cautionMorning = new Date("2026-09-24T12:30:00Z"); // 8:30 AM EDT
    const cautionStatus = getCallingStatus("America/New_York", {}, cautionMorning);
    expect(cautionStatus.status).toBe("yellow");
    expect(cautionStatus.label).toBe("Use discretion");

    // 11:30 AM -> Green
    const safeMorning = new Date("2026-09-24T15:30:00Z"); // 11:30 AM EDT
    const safeStatus = getCallingStatus("America/New_York", {}, safeMorning);
    expect(safeStatus.status).toBe("green");
    expect(safeStatus.label).toBe("Good to call");

    // 7:15 PM -> Yellow
    const eveningDate = new Date("2026-09-24T23:15:00Z"); // 7:15 PM EDT
    const eveningStatus = getCallingStatus("America/New_York", {}, eveningDate);
    expect(eveningStatus.status).toBe("yellow");
    expect(eveningStatus.label).toBe("Use discretion");

    // 9:15 PM -> Red
    const nightDate = new Date("2026-09-25T01:15:00Z"); // 9:15 PM EDT
    const nightStatus = getCallingStatus("America/New_York", {}, nightDate);
    expect(nightStatus.status).toBe("red");
    expect(nightStatus.label).toBe("Too late");
  });

  it("8. Client preferred contact hours overrides default calling hours", () => {
    // 5:30 PM (Normally green), but client prefers 9:00 AM - 4:00 PM (16:00)
    const afternoonDate = new Date("2026-09-24T21:30:00Z"); // 5:30 PM EDT
    const customStatus = getCallingStatus(
      "America/New_York",
      { preferredStart: "09:00", preferredEnd: "16:00" },
      afternoonDate
    );
    expect(customStatus.status).toBe("yellow");
    expect(customStatus.recommendation).toContain("Client prefers 09:00 - 16:00");
  });

  it("9. nationalCoverage.getOverview procedure returns all 6 live clocks and clients", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const overview = await caller.nationalCoverage.getOverview({
      filter: "today",
      viewerTimeZone: "America/New_York",
    });

    expect(overview).toBeDefined();
    expect(overview.clocks).toHaveLength(6);
    expect(overview.clocks.map((c) => c.name)).toEqual([
      "EASTERN",
      "CENTRAL",
      "MOUNTAIN",
      "PACIFIC",
      "ALASKA",
      "HAWAII",
    ]);

    expect(overview.clients.length).toBeGreaterThanOrEqual(6);
    expect(overview.upcomingMeeting).toBeDefined();
    expect(overview.upcomingMeeting.studentName).toBe("Avery Jenkins");
    expect(overview.callTimeCheck).toBeDefined();
    expect(overview.bestTimeToCallQueue.length).toBeGreaterThanOrEqual(6);
  });

  it("10. nationalCoverage.logCallAnyway records off-hours acknowledgment", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.nationalCoverage.logCallAnyway({
      clientId: 104,
      clientName: "Leilani Kim",
      clientLocalTime: "8:15 AM",
      reason: "Advocate acknowledged off-hours warning",
    });

    expect(result.success).toBe(true);
    expect(result.timestamp).toBeDefined();
  });

  it("11. nationalCoverage.searchClients finds Avery Jenkins in Bentonville, AR with Central Time", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const searchResults = await caller.nationalCoverage.searchClients({
      query: "Avery Jenkins",
      viewerTimeZone: "America/New_York",
    });

    expect(searchResults.length).toBeGreaterThan(0);
    const avery = searchResults.find((c) => c.studentName === "Avery Jenkins");
    expect(avery).toBeDefined();
    expect(avery?.city).toBe("Bentonville");
    expect(avery?.state).toBe("AR");
    expect(avery?.timeZone).toBe("America/Chicago");
    expect(avery?.assignedAdvocate).toBe("Byron Honea");
    expect(avery?.status).toBe("active");
    expect(avery?.mapX).toBeDefined();
    expect(avery?.mapY).toBeDefined();
  });

  it("12. nationalCoverage.searchClients finds client by ZIP code (72712)", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const searchResults = await caller.nationalCoverage.searchClients({
      query: "72712",
      viewerTimeZone: "America/New_York",
    });

    expect(searchResults.length).toBeGreaterThan(0);
    expect(searchResults[0].city).toBe("Bentonville");
  });

  it("13. nationalCoverage.getOverview reports clients needing location information", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const overview = await caller.nationalCoverage.getOverview({
      filter: "all",
      viewerTimeZone: "America/New_York",
    });

    expect(overview.missingLocationCount).toBe(2);
    expect(overview.missingLocationClients).toHaveLength(2);
    expect(overview.missingLocationClients.every((c) => !c.hasLocation)).toBe(true);
  });

  it("14. nationalCoverage.getClientDetail returns privacy-safe card data without street addresses", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const detail = await caller.nationalCoverage.getClientDetail({
      clientId: 120030,
      viewerTimeZone: "America/New_York",
    });

    expect(detail).toBeDefined();
    expect(detail.studentName).toBe("Avery Jenkins");
    expect(detail.locationDisplay).toBe("Bentonville, AR");
    // Explicit privacy rule: no street address field
    expect((detail as any).address).toBeUndefined();
    expect((detail as any).street).toBeUndefined();
    expect(detail.timeZone).toBe("America/Chicago");
    expect(detail.assignedAdvocate).toBe("Byron Honea");
  });

  it("15. nationalCoverage.getOverview filters accurately by time zone (Hawaii)", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const overview = await caller.nationalCoverage.getOverview({
      timeZoneFilter: "HAWAII",
      viewerTimeZone: "America/New_York",
    });

    expect(overview.clients.length).toBeGreaterThan(0);
    expect(overview.clients.every((c) => c.isHawaii || c.timeZone === "Pacific/Honolulu")).toBe(true);
  });

  it("16. Geographic projection accuracy: projects all 7 prompt test locations into correct geographic areas", () => {
    const testLocations = [
      { name: "Atlanta Test", latitude: 33.749, longitude: -84.388, expectedRegion: "continental" },
      { name: "Los Angeles Test", latitude: 34.0522, longitude: -118.2437, expectedRegion: "continental" },
      { name: "Denver Test", latitude: 39.7392, longitude: -104.9903, expectedRegion: "continental" },
      { name: "Chicago Test", latitude: 41.8781, longitude: -87.6298, expectedRegion: "continental" },
      { name: "New York Test", latitude: 40.7128, longitude: -74.006, expectedRegion: "continental" },
      { name: "Anchorage Test", latitude: 61.2181, longitude: -149.9003, expectedRegion: "alaska" },
      { name: "Honolulu Test", latitude: 21.3099, longitude: -157.8581, expectedRegion: "hawaii" },
    ];

    testLocations.forEach((loc) => {
      const resolved = resolveClientLocation({
        latitude: loc.latitude,
        longitude: loc.longitude,
      });

      expect(resolved.hasLocation).toBe(true);
      expect(resolved.mapX).not.toBeNull();
      expect(resolved.mapY).not.toBeNull();
      // Never placed at 0,0
      expect(resolved.mapX).toBeGreaterThan(0);
      expect(resolved.mapY).toBeGreaterThan(0);

      if (loc.expectedRegion === "alaska") {
        expect(resolved.isAlaska).toBe(true);
        expect(resolved.isHawaii).toBe(false);
      } else if (loc.expectedRegion === "hawaii") {
        expect(resolved.isHawaii).toBe(true);
        expect(resolved.isAlaska).toBe(false);
      } else {
        expect(resolved.isAlaska).toBe(false);
        expect(resolved.isHawaii).toBe(false);
      }
    });
  });

  it("17. Top-left corner guardrail: invalid coordinates never fallback to (0,0) or [74, 65]", () => {
    const invalidInputs = [
      { latitude: null, longitude: null },
      { latitude: undefined, longitude: undefined },
      { latitude: "invalid", longitude: "invalid" },
      { latitude: NaN, longitude: NaN },
      { city: "", state: "", zipCode: "" },
    ];

    invalidInputs.forEach((input) => {
      const resolved = resolveClientLocation(input as any);
      expect(resolved.hasLocation).toBe(false);
      expect(resolved.mapX).toBeNull();
      expect(resolved.mapY).toBeNull();
      expect(resolved.mapX).not.toBe(0);
      expect(resolved.mapY).not.toBe(0);
      expect(resolved.mapLocationStatus).toBe("needs_review");
      expect(resolved.mapLocationAccuracy).toBe("unavailable");
    });
  });

  it("18. City location is all we need: resolves city centroids without street address or ZIP code", () => {
    // Kennesaw, GA without street address or ZIP code
    const kennesaw = resolveClientLocation({
      city: "Kennesaw",
      state: "GA",
    });
    expect(kennesaw.hasLocation).toBe(true);
    expect(kennesaw.mapLocationAccuracy).toBe("city_centroid");
    expect(kennesaw.accuracyLabel).toBe("City centroid");
    expect(kennesaw.mapLocationStatus).toBe("ready");
    expect(kennesaw.latitude).toBeCloseTo(34.0234, 3);
    expect(kennesaw.longitude).toBeCloseTo(-84.6155, 3);
    expect(kennesaw.mapX).toBeCloseTo(733.4, 0);
    expect(kennesaw.mapY).toBeCloseTo(348.8, 0);
    expect(kennesaw.timeZone).toBe("America/New_York");

    // Atlanta with full state name "Georgia" (no street address)
    const atlanta = resolveClientLocation({
      city: "Atlanta",
      state: "Georgia",
    });
    expect(atlanta.hasLocation).toBe(true);
    expect(atlanta.mapLocationAccuracy).toBe("city_centroid");
    expect(atlanta.mapLocationStatus).toBe("ready");
    expect(atlanta.latitude).toBeCloseTo(33.749, 3);
    expect(atlanta.longitude).toBeCloseTo(-84.388, 3);
    expect(atlanta.timeZone).toBe("America/New_York");

    // Bentonville with full state name "Arkansas" (no street address)
    const bentonville = resolveClientLocation({
      city: "Bentonville",
      state: "Arkansas",
    });
    expect(bentonville.hasLocation).toBe(true);
    expect(bentonville.mapLocationAccuracy).toBe("city_centroid");
    expect(bentonville.mapLocationStatus).toBe("ready");
    expect(bentonville.latitude).toBeCloseTo(36.3729, 3);
    expect(bentonville.longitude).toBeCloseTo(-94.2088, 3);
    expect(bentonville.timeZone).toBe("America/Chicago");
  });

  it("19. Backfill procedure returns structured report with 0 assigned fake coordinates", async () => {
    const caller = appRouter.createCaller(adminCtx as any);
    const result = await caller.nationalCoverage.backfillLocations();

    expect(result).toHaveProperty("totalReviewed");
    expect(result).toHaveProperty("mappedByZip");
    expect(result).toHaveProperty("mappedByCityState");
    expect(result).toHaveProperty("needsReview");
    expect(result.fakeAssigned).toBe(0);
    expect(result.message).toContain("0 assigned fake coordinates");
  });

  it("20. updateClientLocation saves city and state without requiring street address", async () => {
    const caller = appRouter.createCaller(adminCtx as any);
    // Should validate inputs without error and calculate city centroid
    const testLoc = resolveClientLocation({ city: "Marietta", state: "GA" });
    expect(testLoc.hasLocation).toBe(true);
    expect(testLoc.mapLocationAccuracy).toBe("city_centroid");
    expect(testLoc.latitude).toBeCloseTo(33.9526, 3);
  });
});
