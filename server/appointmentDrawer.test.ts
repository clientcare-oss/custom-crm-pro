import { describe, it, expect } from "vitest";
import {
  getStatusBarColor,
  getMeetingPlatformLabel,
  toLocalDateTimeInput,
} from "../client/src/components/calendar/AppointmentDetailDrawer";
import { formatDualTimes, SIX_CORE_ZONES } from "../shared/timezones";

describe("Waypoint Appointment Slide-Out Drawer (PG-007)", () => {
  it("correctly identifies meeting platforms for the pinned Join Meeting button", () => {
    expect(getMeetingPlatformLabel("https://meet.google.com/abc-defg-hij")).toBe("Google Meet");
    expect(getMeetingPlatformLabel("https://us02web.zoom.us/j/1234567890")).toBe("Zoom Meeting");
    expect(getMeetingPlatformLabel("https://teams.microsoft.com/l/meetup-join/19%3a")).toBe("Microsoft Teams");
    expect(getMeetingPlatformLabel("https://waypoint.webex.com/meet/byron")).toBe("Webex");
    expect(getMeetingPlatformLabel("https://example.com/custom-room")).toBe("Virtual Meeting");
  });

  it("assigns appropriate status indicator accent colors", () => {
    expect(getStatusBarColor("Confirmed")).toBe("bg-emerald-500");
    expect(getStatusBarColor("Scheduled")).toBe("bg-sky-500");
    expect(getStatusBarColor("Completed")).toBe("bg-slate-500");
    expect(getStatusBarColor("Cancelled")).toBe("bg-rose-500");
    expect(getStatusBarColor("Needs Coverage")).toBe("bg-amber-500");
    expect(getStatusBarColor("Other")).toBe("bg-[#C5A059]");
  });

  it("correctly formats date strings for HTML datetime-local inputs in edit mode", () => {
    const testDate = new Date(2026, 9, 28, 14, 30, 0); // Oct 28, 2026 at 14:30
    const formatted = toLocalDateTimeInput(testDate);
    expect(formatted).toBe("2026-10-28T14:30");
  });

  it("generates synchronized Dual Time Zone records for the drawer (Client vs Waypoint)", () => {
    const start = new Date("2026-10-28T18:00:00Z"); // 2:00 PM EDT / 11:00 AM PDT
    const end = new Date("2026-10-28T19:00:00Z");

    const dual = formatDualTimes(start, end, "America/Los_Angeles");
    expect(dual.clientTime.tzAbbr).toBe("PDT");
    expect(dual.waypointTime.tzAbbr).toBe("EDT");
    expect(dual.clientTime.isDifferent).toBe(true);
    expect(dual.explanation).toContain("3 hours behind");
  });

  it("strictly enforces AGENTS.md Rule F prohibiting Master Coach", async () => {
    const fs = await import("fs");
    const drawerFile = fs.readFileSync("client/src/components/calendar/AppointmentDetailDrawer.tsx", "utf-8");
    const lower = drawerFile.toLowerCase();
    expect(lower.includes("master coach")).toBe(false);
    expect(lower.includes("master coaching")).toBe(false);
    expect(lower.includes("master iep coach")).toBe(false);
  });
});
