import { describe, it, expect } from "vitest";
import {
  getTimeInZone,
  getTimeDifferenceHours,
  formatDualTimes,
  easternSlotToUtcMs,
  convertEasternSlotToClient,
  getFriendlyTimeZoneName,
} from "../shared/timezones";

describe("Time Zone Scheduling & Dual-Time Visual Contrast", () => {
  it("converts Eastern slot to UTC accurately during Daylight Saving Time (EDT)", () => {
    // 2026-10-05 is EDT (UTC-4). 9:00 AM Eastern should be 13:00:00 UTC.
    const utcMs = easternSlotToUtcMs("2026-10-05", "09:00", "America/New_York");
    const d = new Date(utcMs);
    expect(d.toISOString()).toBe("2026-10-05T13:00:00.000Z");
  });

  it("converts Eastern slot to Pacific client local time", () => {
    // 9:00 AM Eastern should display as 6:00 AM Pacific for a California family
    const converted = convertEasternSlotToClient(
      "2026-10-05",
      "09:00",
      "America/Los_Angeles",
      "America/New_York"
    );

    expect(converted.clientTimeDisplay).toBe("6:00 AM");
    expect(converted.clientTzAbbr).toBe("PDT");
    expect(converted.clientHour24).toBe(6);
    expect(converted.waypointTimeDisplay).toBe("9:00 AM");
    expect(converted.waypointTzAbbr).toBe("EDT");
    expect(converted.isDifferentZone).toBe(true);
  });

  it("converts Eastern slot to Central client local time", () => {
    // 14:00 (2:00 PM) Eastern should display as 1:00 PM Central for a Texas family
    const converted = convertEasternSlotToClient(
      "2026-10-05",
      "14:00",
      "America/Chicago",
      "America/New_York"
    );

    expect(converted.clientTimeDisplay).toBe("1:00 PM");
    expect(converted.clientTzAbbr).toBe("CDT");
    expect(converted.clientHour24).toBe(13);
    expect(converted.waypointTimeDisplay).toBe("2:00 PM");
    expect(converted.isDifferentZone).toBe(true);
  });

  it("handles same time zone (Eastern client and Eastern advocate)", () => {
    const converted = convertEasternSlotToClient(
      "2026-10-05",
      "10:30",
      "America/New_York",
      "America/New_York"
    );

    expect(converted.clientTimeDisplay).toBe("10:30 AM");
    expect(converted.waypointTimeDisplay).toBe("10:30 AM");
    expect(converted.isDifferentZone).toBe(false);
  });

  it("formatDualTimes formats Client Time (Red) and Waypoint Time (Green) distinctly", () => {
    // Meeting at 1:00 PM Eastern / 10:00 AM Pacific for 1 hour
    const startUtc = new Date("2026-10-05T17:00:00.000Z"); // 17:00 UTC = 13:00 EDT = 10:00 PDT
    const endUtc = new Date("2026-10-05T18:00:00.000Z");   // 18:00 UTC = 14:00 EDT = 11:00 PDT

    const dual = formatDualTimes(
      startUtc,
      endUtc,
      "America/Los_Angeles", // Client Time (RED)
      "America/New_York"      // Waypoint Time (GREEN)
    );

    // Client Time (RED)
    expect(dual.clientTime.timeZone).toBe("America/Los_Angeles");
    expect(dual.clientTime.friendlyName).toBe("Pacific");
    expect(dual.clientTime.startTime).toBe("10:00 AM");
    expect(dual.clientTime.endTime).toBe("11:00 AM");
    expect(dual.clientTime.isDifferent).toBe(true);

    // Waypoint Time (GREEN)
    expect(dual.waypointTime.timeZone).toBe("America/New_York");
    expect(dual.waypointTime.friendlyName).toBe("Eastern");
    expect(dual.waypointTime.startTime).toBe("1:00 PM");
    expect(dual.waypointTime.endTime).toBe("2:00 PM");

    // Plain-language contrast explanation
    expect(dual.diffHours).toBe(-3);
    expect(dual.explanation).toContain("Client is 3 hours behind Waypoint (Atlanta)");
  });

  it("formatDualTimes correctly identifies synchronized time when client is in Eastern", () => {
    const startUtc = new Date("2026-10-05T14:00:00.000Z"); // 10:00 AM EDT
    const endUtc = new Date("2026-10-05T15:00:00.000Z");   // 11:00 AM EDT

    const dual = formatDualTimes(
      startUtc,
      endUtc,
      "America/New_York",
      "America/New_York"
    );

    expect(dual.clientTime.isDifferent).toBe(false);
    expect(dual.diffHours).toBe(0);
    expect(dual.explanation).toBe("Client and Waypoint are in the same time zone.");
    expect(dual.clientTime.startTime).toBe("10:00 AM");
    expect(dual.waypointTime.startTime).toBe("10:00 AM");
  });
});
