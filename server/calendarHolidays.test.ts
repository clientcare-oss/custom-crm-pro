import { describe, it, expect } from "vitest";
import {
  computeEasterSunday,
  computeTeacherAppreciationDay,
  getYearlyHolidaysMap,
  matchHolidayArtworkByTitle,
  resolveDayHolidayOverlay,
  HOLIDAY_ARTWORK_CATALOG,
} from "../shared/calendarHolidays";

describe("Waypoint Calendar Dynamic Yearly Holidays & Observance Engine", () => {
  it("computes accurate Easter Sunday dates across multiple years", () => {
    expect(computeEasterSunday(2025)).toEqual({ monthIndex0: 3, day: 20 });
    expect(computeEasterSunday(2026)).toEqual({ monthIndex0: 3, day: 5 });
    expect(computeEasterSunday(2027)).toEqual({ monthIndex0: 2, day: 28 });
    expect(computeEasterSunday(2028)).toEqual({ monthIndex0: 3, day: 16 });
  });

  it("calculates all recurring holidays & Waypoint education observances dynamically for 2026", () => {
    const h2026 = getYearlyHolidaysMap(2026);
    expect(h2026["2026-01-01"]?.slug).toBe("new-years-day");
    expect(h2026["2026-01-19"]?.slug).toBe("mlk-day");
    expect(h2026["2026-02-02"]?.slug).toBe("school-counseling");
    expect(h2026["2026-02-14"]?.slug).toBe("valentines-day");
    expect(h2026["2026-02-16"]?.slug).toBe("presidents-day");
    expect(h2026["2026-02-17"]?.slug).toBe("kindness-day");
    expect(h2026["2026-03-02"]?.slug).toBe("read-across-america");
    expect(h2026["2026-03-17"]?.slug).toBe("st-patricks-day");
    expect(h2026["2026-04-02"]?.slug).toBe("autism-acceptance");
    expect(h2026["2026-04-05"]?.slug).toBe("easter-sunday");
    expect(h2026["2026-04-22"]?.slug).toBe("earth-day");
    expect(h2026["2026-05-01"]?.slug).toBe("mental-health-awareness");
    expect(computeTeacherAppreciationDay(2026)).toBe(5);
    expect(h2026["2026-05-05"]?.slug).toBe("teacher-appreciation");
    expect(h2026["2026-05-10"]?.slug).toBe("mothers-day");
    expect(h2026["2026-05-25"]?.slug).toBe("memorial-day");
    expect(h2026["2026-06-14"]?.slug).toBe("flag-day");
    expect(h2026["2026-06-19"]?.slug).toBe("juneteenth");
    expect(h2026["2026-06-21"]?.slug).toBe("fathers-day");
    expect(h2026["2026-07-04"]?.slug).toBe("independence-day");
    expect(h2026["2026-09-07"]?.slug).toBe("labor-day");
    expect(h2026["2026-09-28"]?.slug).toBe("national-family-day");
    expect(h2026["2026-10-01"]?.slug).toBe("disability-awareness");
    expect(h2026["2026-10-12"]?.slug).toBe("indigenous-peoples-day");
    expect(h2026["2026-10-28"]?.slug).toBe("first-responders");
    expect(h2026["2026-10-31"]?.slug).toBe("halloween");
    expect(h2026["2026-11-11"]?.slug).toBe("veterans-day");
    expect(h2026["2026-11-19"]?.slug).toBe("parent-involvement");
    expect(h2026["2026-11-26"]?.slug).toBe("thanksgiving");
    expect(h2026["2026-12-25"]?.slug).toBe("christmas-day");
    expect(h2026["2026-12-31"]?.slug).toBe("new-years-eve");
  });

  it("recalculates movable dates dynamically for 2027", () => {
    const h2027 = getYearlyHolidaysMap(2027);
    expect(h2027["2027-01-18"]?.slug).toBe("mlk-day");
    expect(h2027["2027-02-15"]?.slug).toBe("presidents-day");
    expect(h2027["2027-03-28"]?.slug).toBe("easter-sunday");
    expect(h2027["2027-05-04"]?.slug).toBe("teacher-appreciation");
    expect(h2027["2027-05-09"]?.slug).toBe("mothers-day");
    expect(h2027["2027-05-31"]?.slug).toBe("memorial-day");
    expect(h2027["2027-06-20"]?.slug).toBe("fathers-day");
    expect(h2027["2027-09-06"]?.slug).toBe("labor-day");
    expect(h2027["2027-10-11"]?.slug).toBe("indigenous-peoples-day");
    expect(h2027["2027-11-18"]?.slug).toBe("parent-involvement");
    expect(h2027["2027-11-25"]?.slug).toBe("thanksgiving");
  });

  it("matches Office Closed and custom holiday blocks to dedicated artworks across all 32 tiles", () => {
    expect(matchHolidayArtworkByTitle("Office Closed", "OFFICE_CLOSED", true)?.slug).toBe("office-closed");
    expect(matchHolidayArtworkByTitle("Columbus Day", "HOLIDAY")?.slug).toBe("columbus-day");

    const closureOverlay = resolveDayHolidayOverlay(2026, "2026-11-27", {
      title: "Office Closed",
      blockType: "OFFICE_CLOSED",
      scope: "ENTIRE_COMPANY",
    });
    expect(closureOverlay?.artwork.slug).toBe("office-closed");
    expect(closureOverlay?.displayLabel).toBe("Office Closed");

    expect(Object.keys(HOLIDAY_ARTWORK_CATALOG)).toHaveLength(32);
  });
});
