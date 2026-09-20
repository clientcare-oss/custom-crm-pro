/**
 * Waypoint Advocates — National Coverage & Time Zone Intelligence
 * Shared master time-zone library using native IANA identifiers and Intl API.
 * Accurately handles DST, Arizona non-DST, and Hawaii non-DST year-round.
 */

export interface TimeZoneDefinition {
  id: string; // IANA identifier
  name: string; // Display name (e.g. "Eastern")
  code: string; // Standard abbreviation (e.g. "ET")
  color: string; // Theme accent class or hex
  description: string;
}

export const IANA_TIME_ZONES: Record<string, TimeZoneDefinition> = {
  EASTERN: {
    id: "America/New_York",
    name: "Eastern",
    code: "ET",
    color: "#818cf8", // Electric violet/blue
    description: "Eastern Time (New York, Atlanta, Miami, DC)",
  },
  CENTRAL: {
    id: "America/Chicago",
    name: "Central",
    code: "CT",
    color: "#60a5fa", // Bright blue
    description: "Central Time (Chicago, Dallas, Austin, New Orleans)",
  },
  MOUNTAIN: {
    id: "America/Denver",
    name: "Mountain",
    code: "MT",
    color: "#38bdf8", // Light sky blue
    description: "Mountain Time (Denver, Salt Lake City, Boise)",
  },
  ARIZONA: {
    id: "America/Phoenix",
    name: "Mountain (Arizona)",
    code: "MST",
    color: "#2dd4bf", // Teal
    description: "Mountain Standard Time (No DST observed in most of AZ)",
  },
  PACIFIC: {
    id: "America/Los_Angeles",
    name: "Pacific",
    code: "PT",
    color: "#34d399", // Mint/Emerald
    description: "Pacific Time (Los Angeles, Seattle, San Francisco, Portland)",
  },
  ALASKA: {
    id: "America/Anchorage",
    name: "Alaska",
    code: "AKT",
    color: "#a78bfa", // Lavender/purple
    description: "Alaska Time (Anchorage, Juneau, Fairbanks)",
  },
  HAWAII: {
    id: "Pacific/Honolulu",
    name: "Hawaii",
    code: "HT",
    color: "#f472b6", // Rose/pink (No orange)
    description: "Hawaii-Aleutian Standard Time (Honolulu, No DST)",
  },
};

export const SIX_CORE_ZONES: TimeZoneDefinition[] = [
  IANA_TIME_ZONES.EASTERN,
  IANA_TIME_ZONES.CENTRAL,
  IANA_TIME_ZONES.MOUNTAIN,
  IANA_TIME_ZONES.PACIFIC,
  IANA_TIME_ZONES.ALASKA,
  IANA_TIME_ZONES.HAWAII,
];

export interface CallingStatusResult {
  status: "green" | "yellow" | "red";
  label: "Good to call" | "Use discretion" | "Too early" | "Too late" | "Outside preferred hours";
  recommendation: string;
  isPreferredMatch: boolean;
  hour: number;
  minute: number;
  timeString: string;
  period: "AM" | "PM";
  tzAbbr: string;
}

export interface CallingHoursConfig {
  greenStartHour?: number; // default 9 (9:00 AM)
  greenEndHour?: number; // default 18 (6:00 PM)
  yellowMorningHour?: number; // default 8 (8:00 AM)
  yellowEveningHour?: number; // default 20 (8:00 PM)
  preferredStart?: string | null; // e.g. "09:00"
  preferredEnd?: string | null; // e.g. "16:00"
  mayCallOutsidePreferred?: boolean;
}

/**
 * Get current time in a given IANA time zone
 */
export function getTimeInZone(timeZone: string, refDate: Date = new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const parts = formatter.formatToParts(refDate);
    const hourStr = parts.find((p) => p.type === "hour")?.value || "12";
    const minStr = parts.find((p) => p.type === "minute")?.value || "00";
    const dayPeriod = (parts.find((p) => p.type === "dayPeriod")?.value || "AM").toUpperCase() as "AM" | "PM";

    // 24-hour hour for logic
    const formatter24 = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hour12: false,
    });
    const hour24 = parseInt(formatter24.format(refDate), 10) || 0;
    const minute = parseInt(minStr, 10) || 0;

    // Timezone short abbreviation
    const tzFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
    });
    const tzParts = tzFormatter.formatToParts(refDate);
    const tzAbbr = tzParts.find((p) => p.type === "timeZoneName")?.value || "";

    return {
      timeString: `${hourStr}:${minStr} ${dayPeriod}`,
      timeOnly: `${hourStr}:${minStr}`,
      hour: hour24,
      minute,
      period: dayPeriod,
      tzAbbr,
    };
  } catch (err) {
    // Fallback if invalid IANA timeZone string
    return {
      timeString: "12:00 PM",
      timeOnly: "12:00",
      hour: 12,
      minute: 0,
      period: "PM" as const,
      tzAbbr: "UTC",
    };
  }
}

/**
 * Calculates the exact dynamic hour difference between target and viewer zones.
 * Positive means target is ahead of viewer, negative means target is behind viewer.
 */
export function getTimeDifferenceHours(targetZone: string, viewerZone: string = "America/New_York", refDate: Date = new Date()): number {
  try {
    const target = getTimeInZone(targetZone, refDate);
    const viewer = getTimeInZone(viewerZone, refDate);

    // Calculate difference by creating UTC timestamps with matched YMD
    const dTarget = new Date(refDate.toLocaleString("en-US", { timeZone: targetZone }));
    const dViewer = new Date(refDate.toLocaleString("en-US", { timeZone: viewerZone }));
    const diffHours = Math.round((dTarget.getTime() - dViewer.getTime()) / (1000 * 60 * 60));
    return diffHours;
  } catch {
    return 0;
  }
}

/**
 * Returns a human-friendly string for the time difference:
 * e.g., "3 hours behind you", "Same time", "1 hour ahead of you"
 */
export function formatTimeDifferenceText(diffHours: number): string {
  if (diffHours === 0) return "Same time as you";
  if (diffHours < 0) {
    const abs = Math.abs(diffHours);
    return `${abs} hour${abs === 1 ? "" : "s"} behind you`;
  }
  return `${diffHours} hour${diffHours === 1 ? "" : "s"} ahead of you`;
}

/**
 * Safe Calling Guidance Evaluator
 * Green: 9:00 AM – 6:00 PM
 * Yellow: 8:00 AM – 8:59 AM & 6:01 PM – 8:00 PM
 * Red: Before 8:00 AM & After 8:00 PM
 * Client preferred hours override defaults when present.
 */
export function getCallingStatus(
  targetZone: string,
  config: CallingHoursConfig = {},
  refDate: Date = new Date()
): CallingStatusResult {
  const timeInfo = getTimeInZone(targetZone, refDate);
  const { hour, minute, period, tzAbbr, timeString } = timeInfo;
  const currentMinutes = hour * 60 + minute;

  const greenStart = (config.greenStartHour ?? 9) * 60; // 9:00 AM = 540 min
  const greenEnd = (config.greenEndHour ?? 18) * 60; // 6:00 PM = 1080 min
  const yellowMorn = (config.yellowMorningHour ?? 8) * 60; // 8:00 AM = 480 min
  const yellowEve = (config.yellowEveningHour ?? 20) * 60; // 8:00 PM = 1200 min

  // Check client preferred hours override
  if (config.preferredStart && config.preferredEnd) {
    const [pStartH, pStartM] = config.preferredStart.split(":").map(Number);
    const [pEndH, pEndM] = config.preferredEnd.split(":").map(Number);
    const prefStartMin = (pStartH || 0) * 60 + (pStartM || 0);
    const prefEndMin = (pEndH || 0) * 60 + (pEndM || 0);

    if (currentMinutes >= prefStartMin && currentMinutes < prefEndMin) {
      return {
        status: "green",
        label: "Good to call",
        recommendation: "Inside client preferred calling window",
        isPreferredMatch: true,
        hour,
        minute,
        timeString,
        period,
        tzAbbr,
      };
    } else {
      // Outside preferred hours
      const isExtreme = currentMinutes < yellowMorn || currentMinutes >= yellowEve;
      return {
        status: isExtreme ? "red" : "yellow",
        label: isExtreme ? "Too early" : "Use discretion",
        recommendation: `Client prefers ${config.preferredStart} - ${config.preferredEnd}`,
        isPreferredMatch: false,
        hour,
        minute,
        timeString,
        period,
        tzAbbr,
      };
    }
  }

  // Standard Company Rules
  if (currentMinutes >= greenStart && currentMinutes < greenEnd) {
    return {
      status: "green",
      label: "Good to call",
      recommendation: "Call anytime",
      isPreferredMatch: true,
      hour,
      minute,
      timeString,
      period,
      tzAbbr,
    };
  }

  if (currentMinutes >= yellowMorn && currentMinutes < greenStart) {
    const minsUntil9 = greenStart - currentMinutes;
    return {
      status: "yellow",
      label: "Use discretion",
      recommendation: minsUntil9 <= 45 ? `Consider calling after 9:00 AM (${minsUntil9}m)` : "Wait until after 9:00 AM",
      isPreferredMatch: false,
      hour,
      minute,
      timeString,
      period,
      tzAbbr,
    };
  }

  if (currentMinutes >= greenEnd && currentMinutes < yellowEve) {
    return {
      status: "yellow",
      label: "Use discretion",
      recommendation: "Evening window — confirm urgency before calling",
      isPreferredMatch: false,
      hour,
      minute,
      timeString,
      period,
      tzAbbr,
    };
  }

  if (currentMinutes < yellowMorn) {
    return {
      status: "red",
      label: "Too early",
      recommendation: "Wait until after 9:00 AM local time",
      isPreferredMatch: false,
      hour,
      minute,
      timeString,
      period,
      tzAbbr,
    };
  }

  return {
    status: "red",
    label: "Too late",
    recommendation: "After calling hours — schedule for tomorrow",
    isPreferredMatch: false,
    hour,
    minute,
    timeString,
    period,
    tzAbbr,
  };
}

/**
 * Plain-language time explanation generator:
 * "When it is 8:00 AM for the school, it will be 11:00 AM for you."
 */
export function formatPlainLanguageExplanation(
  eventTime: Date,
  schoolOrClientTz: string,
  viewerTz: string = "America/New_York",
  targetRoleName: string = "school"
): string {
  const schoolTime = getTimeInZone(schoolOrClientTz, eventTime);
  const viewerTime = getTimeInZone(viewerTz, eventTime);

  if (schoolOrClientTz === viewerTz) {
    return `Both you and the ${targetRoleName} are in the same time zone (${viewerTime.timeString} ${viewerTime.tzAbbr}).`;
  }

  return `When it is ${schoolTime.timeString} for the ${targetRoleName}, it will be ${viewerTime.timeString} for you.`;
}

/**
 * Heuristic detector for likely time zone based on US state and ZIP code.
 * Flagged with confidence to encourage advocate confirmation.
 */
export function detectTimeZoneFromLocation(city?: string, state?: string, zipCode?: string): {
  timeZone: string;
  confidence: "high" | "medium" | "approximate";
  source: string;
} {
  const rawState = (state || "").trim().toUpperCase();
  const stateMap: Record<string, string> = {
    GEORGIA: "GA", CALIFORNIA: "CA", "NEW YORK": "NY", TEXAS: "TX", FLORIDA: "FL",
    ILLINOIS: "IL", WASHINGTON: "WA", COLORADO: "CO", ARIZONA: "AZ", ALASKA: "AK",
    HAWAII: "HI", ARKANSAS: "AR", ALABAMA: "AL", CONNECTICUT: "CT", DELAWARE: "DE",
    IDAHO: "ID", INDIANA: "IN", IOWA: "IA", KANSAS: "KS", KENTUCKY: "KY",
    LOUISIANA: "LA", MAINE: "ME", MARYLAND: "MD", MASSACHUSETTS: "MA", MICHIGAN: "MI",
    MINNESOTA: "MN", MISSISSIPPI: "MS", MISSOURI: "MO", MONTANA: "MT", NEBRASKA: "NE",
    NEVADA: "NV", "NEW HAMPSHIRE": "NH", "NEW JERSEY": "NJ", "NEW MEXICO": "NM",
    "NORTH CAROLINA": "NC", "NORTH DAKOTA": "ND", OHIO: "OH", OKLAHOMA: "OK", OREGON: "OR",
    PENNSYLVANIA: "PA", "RHODE ISLAND": "RI", "SOUTH CAROLINA": "SC", "SOUTH DAKOTA": "SD",
    TENNESSEE: "TN", UTAH: "UT", VERMONT: "VT", VIRGINIA: "VA", "WEST VIRGINIA": "WV",
    WISCONSIN: "WI", WYOMING: "WY", "DISTRICT OF COLUMBIA": "DC",
  };
  const st = stateMap[rawState] || rawState;
  const zip = (zipCode || "").trim();

  // Explicit ZIP code ranges for split states
  if (zip.length >= 3) {
    const zip3 = parseInt(zip.slice(0, 3), 10);
    // Florida Panhandle (Central Time: 324xx, 325xx)
    if (zip3 === 324 || zip3 === 325) {
      return { timeZone: "America/Chicago", confidence: "high", source: "ZIP range (Florida Panhandle - Central)" };
    }
    // Indiana Northwest / Southwest (Central: 463xx, 464xx, 475xx, 476xx, 477xx)
    if (zip3 === 463 || zip3 === 464 || (zip3 >= 475 && zip3 <= 477)) {
      return { timeZone: "America/Chicago", confidence: "high", source: "ZIP range (Indiana Central)" };
    }
    // Tennessee West (Central: 370xx-383xx) vs East (Eastern: 376xx-379xx)
    if (zip3 >= 376 && zip3 <= 379) {
      return { timeZone: "America/New_York", confidence: "high", source: "ZIP range (Tennessee Eastern)" };
    }
    if (zip3 >= 370 && zip3 <= 385) {
      return { timeZone: "America/Chicago", confidence: "high", source: "ZIP range (Tennessee Central)" };
    }
    // Kentucky West (Central: 420xx-424xx)
    if (zip3 >= 420 && zip3 <= 424) {
      return { timeZone: "America/Chicago", confidence: "high", source: "ZIP range (Kentucky Central)" };
    }
  }

  // Hawaii
  if (st === "HI" || st === "HAWAII") {
    return { timeZone: "Pacific/Honolulu", confidence: "high", source: "State match (Hawaii Standard)" };
  }

  // Alaska
  if (st === "AK" || st === "ALASKA") {
    return { timeZone: "America/Anchorage", confidence: "high", source: "State match (Alaska)" };
  }

  // Arizona (No DST)
  if (st === "AZ" || st === "ARIZONA") {
    return { timeZone: "America/Phoenix", confidence: "high", source: "State match (Arizona No DST)" };
  }

  // Pacific States
  const pacificStates = ["CA", "WA", "OR", "NV"];
  if (pacificStates.includes(st)) {
    return { timeZone: "America/Los_Angeles", confidence: "high", source: "State match (Pacific)" };
  }

  // Mountain States
  const mountainStates = ["CO", "UT", "NM", "WY", "MT", "ID"];
  if (mountainStates.includes(st)) {
    return { timeZone: "America/Denver", confidence: "high", source: "State match (Mountain)" };
  }

  // Central States
  const centralStates = ["TX", "IL", "MO", "MN", "WI", "IA", "KS", "NE", "OK", "AR", "LA", "MS", "AL", "ND", "SD"];
  if (centralStates.includes(st)) {
    return { timeZone: "America/Chicago", confidence: "high", source: "State match (Central)" };
  }

  // Eastern States
  const easternStates = ["GA", "NY", "FL", "NC", "SC", "VA", "PA", "OH", "MI", "NJ", "MA", "MD", "ME", "NH", "VT", "CT", "RI", "DE", "WV", "DC"];
  if (easternStates.includes(st)) {
    return { timeZone: "America/New_York", confidence: "high", source: "State match (Eastern)" };
  }

  // Fallback to Eastern (Waypoint headquarters in Atlanta, GA)
  return { timeZone: "America/New_York", confidence: "approximate", source: "Default fallback (Eastern)" };
}

/**
 * Returns a friendly label for an IANA time-zone string.
 */
export function getFriendlyTimeZoneName(ianaZone: string): string {
  switch (ianaZone) {
    case "America/New_York":
      return "Eastern";
    case "America/Chicago":
      return "Central";
    case "America/Denver":
      return "Mountain";
    case "America/Phoenix":
      return "Mountain (Arizona)";
    case "America/Los_Angeles":
      return "Pacific";
    case "America/Anchorage":
      return "Alaska";
    case "Pacific/Honolulu":
      return "Hawaii";
    default:
      return ianaZone.split("/").pop()?.replace(/_/g, " ") || ianaZone;
  }
}
