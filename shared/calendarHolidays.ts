export type HolidayArtworkTone = "light" | "dark";

export type HolidayArtworkSlug =
  | "new-years-day"
  | "mlk-day"
  | "presidents-day"
  | "st-patricks-day"
  | "easter-sunday"
  | "mothers-day"
  | "memorial-day"
  | "juneteenth"
  | "independence-day"
  | "labor-day"
  | "indigenous-peoples-day"
  | "columbus-day"
  | "veterans-day"
  | "thanksgiving"
  | "christmas-day"
  | "halloween"
  | "valentines-day"
  | "earth-day"
  | "fathers-day"
  | "office-closed"
  | "autism-acceptance"
  | "disability-awareness"
  | "mental-health-awareness"
  | "teacher-appreciation"
  | "read-across-america"
  | "parent-involvement"
  | "national-family-day"
  | "kindness-day"
  | "new-years-eve"
  | "flag-day"
  | "school-counseling"
  | "first-responders";

export interface CalendarHolidayDefinition {
  slug: HolidayArtworkSlug;
  name: string;
  imagePath: string;
  tone: HolidayArtworkTone;
  /** Override contrast tone for upper-left day number when corner artwork is dark on a light-center tile */
  dateNumTone?: HolidayArtworkTone;
  /** Align live holiday title away from left-anchored artwork subjects */
  titleAlign?: "center" | "right";
  objectPosition?: string;
}

export const HOLIDAY_ARTWORK_CATALOG: Record<HolidayArtworkSlug, CalendarHolidayDefinition> = {
  "new-years-day": {
    slug: "new-years-day",
    name: "New Year's Day",
    imagePath: "/assets/calendar/holidays/new-years-day.jpg",
    tone: "dark",
    objectPosition: "center 72%",
  },
  "mlk-day": {
    slug: "mlk-day",
    name: "Martin Luther King, Jr. Day",
    imagePath: "/assets/calendar/holidays/mlk-day.jpg",
    tone: "light",
    objectPosition: "center bottom",
  },
  "school-counseling": {
    slug: "school-counseling",
    name: "School Counseling Week",
    imagePath: "/assets/calendar/holidays/school-counseling.jpg",
    tone: "light",
    titleAlign: "right",
    objectPosition: "left center",
  },
  "valentines-day": {
    slug: "valentines-day",
    name: "Valentine's Day",
    imagePath: "/assets/calendar/holidays/valentines-day.jpg",
    tone: "light",
    objectPosition: "center bottom",
  },
  "kindness-day": {
    slug: "kindness-day",
    name: "Random Acts of Kindness Day",
    imagePath: "/assets/calendar/holidays/kindness-day.jpg",
    tone: "light",
    objectPosition: "center bottom",
  },
  "presidents-day": {
    slug: "presidents-day",
    name: "Presidents' Day",
    imagePath: "/assets/calendar/holidays/presidents-day.jpg",
    tone: "light",
    objectPosition: "center bottom",
  },
  "read-across-america": {
    slug: "read-across-america",
    name: "Read Across America Day",
    imagePath: "/assets/calendar/holidays/read-across-america.jpg",
    tone: "light",
    objectPosition: "center bottom",
  },
  "st-patricks-day": {
    slug: "st-patricks-day",
    name: "St. Patrick's Day",
    imagePath: "/assets/calendar/holidays/st-patricks-day.jpg",
    tone: "light",
    objectPosition: "center bottom",
  },
  "easter-sunday": {
    slug: "easter-sunday",
    name: "Easter Sunday",
    imagePath: "/assets/calendar/holidays/easter-sunday.jpg",
    tone: "light",
    objectPosition: "center bottom",
  },
  "autism-acceptance": {
    slug: "autism-acceptance",
    name: "Autism Acceptance Day",
    imagePath: "/assets/calendar/holidays/autism-acceptance.jpg",
    tone: "light",
    dateNumTone: "dark",
    titleAlign: "right",
    objectPosition: "left bottom",
  },
  "earth-day": {
    slug: "earth-day",
    name: "Earth Day",
    imagePath: "/assets/calendar/holidays/earth-day.jpg",
    tone: "light",
    objectPosition: "center bottom",
  },
  "mental-health-awareness": {
    slug: "mental-health-awareness",
    name: "Mental Health Awareness",
    imagePath: "/assets/calendar/holidays/mental-health-awareness.jpg",
    tone: "light",
    dateNumTone: "dark",
    titleAlign: "right",
    objectPosition: "left bottom",
  },
  "teacher-appreciation": {
    slug: "teacher-appreciation",
    name: "Thank a Teacher Day",
    imagePath: "/assets/calendar/holidays/teacher-appreciation.jpg",
    tone: "light",
    titleAlign: "right",
    objectPosition: "left bottom",
  },
  "mothers-day": {
    slug: "mothers-day",
    name: "Mother's Day",
    imagePath: "/assets/calendar/holidays/mothers-day.jpg",
    tone: "light",
    objectPosition: "center bottom",
  },
  "memorial-day": {
    slug: "memorial-day",
    name: "Memorial Day",
    imagePath: "/assets/calendar/holidays/memorial-day.jpg",
    tone: "dark",
    objectPosition: "center 65%",
  },
  "flag-day": {
    slug: "flag-day",
    name: "Flag Day",
    imagePath: "/assets/calendar/holidays/flag-day.jpg",
    tone: "dark",
    objectPosition: "center center",
  },
  "fathers-day": {
    slug: "fathers-day",
    name: "Father's Day",
    imagePath: "/assets/calendar/holidays/fathers-day.jpg",
    tone: "light",
    objectPosition: "center bottom",
  },
  juneteenth: {
    slug: "juneteenth",
    name: "Juneteenth",
    imagePath: "/assets/calendar/holidays/juneteenth.jpg",
    tone: "light",
    objectPosition: "center bottom",
  },
  "independence-day": {
    slug: "independence-day",
    name: "Independence Day",
    imagePath: "/assets/calendar/holidays/independence-day.jpg",
    tone: "dark",
    objectPosition: "center center",
  },
  "labor-day": {
    slug: "labor-day",
    name: "Labor Day",
    imagePath: "/assets/calendar/holidays/labor-day.jpg",
    tone: "light",
    objectPosition: "center bottom",
  },
  "national-family-day": {
    slug: "national-family-day",
    name: "National Family Day",
    imagePath: "/assets/calendar/holidays/national-family-day.jpg",
    tone: "light",
    objectPosition: "center bottom",
  },
  "disability-awareness": {
    slug: "disability-awareness",
    name: "Disability Awareness",
    imagePath: "/assets/calendar/holidays/disability-awareness.jpg",
    tone: "light",
    dateNumTone: "dark",
    titleAlign: "right",
    objectPosition: "left center",
  },
  "indigenous-peoples-day": {
    slug: "indigenous-peoples-day",
    name: "Indigenous Peoples' Day",
    imagePath: "/assets/calendar/holidays/indigenous-peoples-day.jpg",
    tone: "light",
    objectPosition: "center bottom",
  },
  "columbus-day": {
    slug: "columbus-day",
    name: "Columbus Day",
    imagePath: "/assets/calendar/holidays/columbus-day.jpg",
    tone: "light",
    objectPosition: "center bottom",
  },
  "first-responders": {
    slug: "first-responders",
    name: "First Responders Day",
    imagePath: "/assets/calendar/holidays/first-responders.jpg",
    tone: "dark",
    objectPosition: "center bottom",
  },
  halloween: {
    slug: "halloween",
    name: "Halloween",
    imagePath: "/assets/calendar/holidays/halloween.jpg",
    tone: "dark",
    objectPosition: "center bottom",
  },
  "veterans-day": {
    slug: "veterans-day",
    name: "Veterans Day",
    imagePath: "/assets/calendar/holidays/veterans-day.jpg",
    tone: "light",
    dateNumTone: "dark",
    objectPosition: "center bottom",
  },
  "parent-involvement": {
    slug: "parent-involvement",
    name: "Parent Involvement Day",
    imagePath: "/assets/calendar/holidays/parent-involvement.jpg",
    tone: "light",
    titleAlign: "right",
    objectPosition: "left bottom",
  },
  thanksgiving: {
    slug: "thanksgiving",
    name: "Thanksgiving",
    imagePath: "/assets/calendar/holidays/thanksgiving.jpg",
    tone: "light",
    objectPosition: "center bottom",
  },
  "christmas-day": {
    slug: "christmas-day",
    name: "Christmas Day",
    imagePath: "/assets/calendar/holidays/christmas-day.jpg",
    tone: "light",
    dateNumTone: "dark",
    objectPosition: "center bottom",
  },
  "new-years-eve": {
    slug: "new-years-eve",
    name: "New Year's Eve",
    imagePath: "/assets/calendar/holidays/new-years-eve.jpg",
    tone: "dark",
    objectPosition: "right bottom",
  },
  "office-closed": {
    slug: "office-closed",
    name: "Office Closed",
    imagePath: "/assets/calendar/holidays/office-closed.jpg",
    tone: "light",
    objectPosition: "center center",
  },
};

function toDateKey(year: number, monthIndex0: number, day: number): string {
  return `${year}-${String(monthIndex0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Returns the day-of-month (1..31) for the Nth occurrence of `weekday` (0=Sun..6=Sat) in `monthIndex0` (0=Jan..11=Dec).
 */
export function nthWeekdayOfMonth(
  year: number,
  monthIndex0: number,
  weekday: number,
  nth: number
): number {
  const firstDow = new Date(year, monthIndex0, 1).getDay();
  const offset = (weekday - firstDow + 7) % 7;
  return 1 + offset + (nth - 1) * 7;
}

/**
 * Returns the day-of-month (1..31) for the LAST occurrence of `weekday` (0=Sun..6=Sat) in `monthIndex0`.
 */
export function lastWeekdayOfMonth(
  year: number,
  monthIndex0: number,
  weekday: number
): number {
  const lastDay = new Date(year, monthIndex0 + 1, 0).getDate();
  const lastDow = new Date(year, monthIndex0, lastDay).getDay();
  const offset = (lastDow - weekday + 7) % 7;
  return lastDay - offset;
}

/**
 * National Teacher Appreciation Day: Tuesday of the first FULL week (Mon–Fri) of May.
 */
export function computeTeacherAppreciationDay(year: number): number {
  const firstMonday = nthWeekdayOfMonth(year, 4, 1, 1);
  return firstMonday + 1;
}

/**
 * Anonymous Gregorian algorithm (Meeus/Jones/Butcher) for Easter Sunday.
 */
export function computeEasterSunday(year: number): { monthIndex0: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { monthIndex0: month - 1, day };
}

const yearCache = new Map<number, Record<string, CalendarHolidayDefinition>>();

/**
 * Dynamically calculates all recurring US holidays & Waypoint education/community observances for any year.
 */
export function getYearlyHolidaysMap(year: number): Record<string, CalendarHolidayDefinition> {
  const cached = yearCache.get(year);
  if (cached) return cached;

  const map: Record<string, CalendarHolidayDefinition> = {};
  const add = (monthIndex0: number, day: number, slug: HolidayArtworkSlug) => {
    const key = toDateKey(year, monthIndex0, day);
    const def = HOLIDAY_ARTWORK_CATALOG[slug];
    if (map[key]) {
      map[key] = {
        ...map[key],
        name: `${map[key].name} · ${def.name}`,
      };
    } else {
      map[key] = def;
    }
  };

  // January
  add(0, 1, "new-years-day");
  add(0, nthWeekdayOfMonth(year, 0, 1, 3), "mlk-day");

  // February
  add(1, nthWeekdayOfMonth(year, 1, 1, 1), "school-counseling");
  add(1, 14, "valentines-day");
  add(1, 17, "kindness-day");
  add(1, nthWeekdayOfMonth(year, 1, 1, 3), "presidents-day");

  // March
  add(2, 2, "read-across-america");
  add(2, 17, "st-patricks-day");

  // Easter Sunday (March or April)
  const easter = computeEasterSunday(year);
  add(easter.monthIndex0, easter.day, "easter-sunday");

  // April
  add(3, 2, "autism-acceptance");
  add(3, 22, "earth-day");

  // May
  add(4, 1, "mental-health-awareness");
  add(4, computeTeacherAppreciationDay(year), "teacher-appreciation");
  add(4, nthWeekdayOfMonth(year, 4, 0, 2), "mothers-day");
  add(4, lastWeekdayOfMonth(year, 4, 1), "memorial-day");

  // June
  add(5, 14, "flag-day");
  add(5, 19, "juneteenth");
  add(5, nthWeekdayOfMonth(year, 5, 0, 3), "fathers-day");

  // July
  add(6, 4, "independence-day");

  // September
  add(8, nthWeekdayOfMonth(year, 8, 1, 1), "labor-day");
  add(8, nthWeekdayOfMonth(year, 8, 1, 4), "national-family-day");

  // October
  add(9, 1, "disability-awareness");
  add(9, nthWeekdayOfMonth(year, 9, 1, 2), "indigenous-peoples-day");
  add(9, 28, "first-responders");
  add(9, 31, "halloween");

  // November
  add(10, 11, "veterans-day");
  add(10, nthWeekdayOfMonth(year, 10, 4, 3), "parent-involvement");
  add(10, nthWeekdayOfMonth(year, 10, 4, 4), "thanksgiving");

  // December
  add(11, 25, "christmas-day");
  add(11, 31, "new-years-eve");

  yearCache.set(year, map);
  return map;
}

/**
 * Matches an operational block title/type to its corresponding seasonal artwork.
 */
export function matchHolidayArtworkByTitle(
  title?: string | null,
  blockType?: string | null,
  isAllDayClosure = false
): CalendarHolidayDefinition | null {
  const text = `${title || ""} ${blockType || ""}`.toLowerCase();
  if (text.includes("columbus")) return HOLIDAY_ARTWORK_CATALOG["columbus-day"];
  if (text.includes("indigenous")) return HOLIDAY_ARTWORK_CATALOG["indigenous-peoples-day"];
  if (text.includes("new year's eve") || text.includes("new years eve")) return HOLIDAY_ARTWORK_CATALOG["new-years-eve"];
  if (text.includes("new year")) return HOLIDAY_ARTWORK_CATALOG["new-years-day"];
  if (text.includes("martin luther") || text.includes("mlk")) return HOLIDAY_ARTWORK_CATALOG["mlk-day"];
  if (text.includes("school counsel")) return HOLIDAY_ARTWORK_CATALOG["school-counseling"];
  if (text.includes("kindness")) return HOLIDAY_ARTWORK_CATALOG["kindness-day"];
  if (text.includes("president")) return HOLIDAY_ARTWORK_CATALOG["presidents-day"];
  if (text.includes("read across")) return HOLIDAY_ARTWORK_CATALOG["read-across-america"];
  if (text.includes("st. patrick") || text.includes("st patrick")) return HOLIDAY_ARTWORK_CATALOG["st-patricks-day"];
  if (text.includes("easter")) return HOLIDAY_ARTWORK_CATALOG["easter-sunday"];
  if (text.includes("autism")) return HOLIDAY_ARTWORK_CATALOG["autism-acceptance"];
  if (text.includes("mental health")) return HOLIDAY_ARTWORK_CATALOG["mental-health-awareness"];
  if (text.includes("teacher")) return HOLIDAY_ARTWORK_CATALOG["teacher-appreciation"];
  if (text.includes("mother")) return HOLIDAY_ARTWORK_CATALOG["mothers-day"];
  if (text.includes("memorial")) return HOLIDAY_ARTWORK_CATALOG["memorial-day"];
  if (text.includes("flag day")) return HOLIDAY_ARTWORK_CATALOG["flag-day"];
  if (text.includes("juneteenth")) return HOLIDAY_ARTWORK_CATALOG["juneteenth"];
  if (text.includes("independence") || text.includes("4th of july") || text.includes("fourth of july")) {
    return HOLIDAY_ARTWORK_CATALOG["independence-day"];
  }
  if (text.includes("labor day")) return HOLIDAY_ARTWORK_CATALOG["labor-day"];
  if (text.includes("family day")) return HOLIDAY_ARTWORK_CATALOG["national-family-day"];
  if (text.includes("disability")) return HOLIDAY_ARTWORK_CATALOG["disability-awareness"];
  if (text.includes("first responder")) return HOLIDAY_ARTWORK_CATALOG["first-responders"];
  if (text.includes("veteran")) return HOLIDAY_ARTWORK_CATALOG["veterans-day"];
  if (text.includes("parent involvement")) return HOLIDAY_ARTWORK_CATALOG["parent-involvement"];
  if (text.includes("thanksgiving")) return HOLIDAY_ARTWORK_CATALOG["thanksgiving"];
  if (text.includes("christmas")) return HOLIDAY_ARTWORK_CATALOG["christmas-day"];
  if (text.includes("halloween")) return HOLIDAY_ARTWORK_CATALOG["halloween"];
  if (text.includes("valentine")) return HOLIDAY_ARTWORK_CATALOG["valentines-day"];
  if (text.includes("earth day")) return HOLIDAY_ARTWORK_CATALOG["earth-day"];
  if (text.includes("father")) return HOLIDAY_ARTWORK_CATALOG["fathers-day"];
  if (
    isAllDayClosure ||
    text.includes("office closed") ||
    text.includes("office closure") ||
    text.includes("office_closed") ||
    text.includes("company closure")
  ) {
    return HOLIDAY_ARTWORK_CATALOG["office-closed"];
  }
  return null;
}

/**
 * Resolves the edge-to-edge Holiday Artwork Overlay for a given calendar cell date (`YYYY-MM-DD`).
 */
export function resolveDayHolidayOverlay(
  year: number,
  dateKey: string,
  allDayNoticeBlock?: { title?: string | null; blockType?: string | null; scope?: string | null } | null
): {
  artwork: CalendarHolidayDefinition;
  displayLabel: string;
} | null {
  const yearly = getYearlyHolidaysMap(year);
  const calendarHoliday = yearly[dateKey] || null;

  if (allDayNoticeBlock) {
    const isClosure =
      allDayNoticeBlock.scope === "ENTIRE_COMPANY" ||
      (allDayNoticeBlock.blockType || "").toLowerCase().includes("closed") ||
      (allDayNoticeBlock.blockType || "").toLowerCase().includes("closure");
    const blockMatch = matchHolidayArtworkByTitle(
      allDayNoticeBlock.title,
      allDayNoticeBlock.blockType,
      isClosure
    );
    if (blockMatch) {
      return {
        artwork: blockMatch,
        displayLabel: (allDayNoticeBlock.title || blockMatch.name).trim(),
      };
    }
    if (calendarHoliday) {
      return {
        artwork: calendarHoliday,
        displayLabel: (allDayNoticeBlock.title || calendarHoliday.name).trim(),
      };
    }
  }

  if (calendarHoliday) {
    return {
      artwork: calendarHoliday,
      displayLabel: calendarHoliday.name,
    };
  }

  return null;
}
