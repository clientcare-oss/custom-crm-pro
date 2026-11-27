import { formatWaypointCalendarEvent, detectItemPatternKey } from "./CalendarPatternStyles";

export type CalendarOrbCategoryKey =
  | "iep"
  | "advocacy"
  | "discovery"
  | "team"
  | "deadline"
  | "other";

export interface CalendarOrbCategoryDef {
  key: CalendarOrbCategoryKey;
  label: string;
  orbClass: string;
  pillClass: string;
  showAlertIcon?: boolean;
}

export const CALENDAR_ORB_CATEGORIES: CalendarOrbCategoryDef[] = [
  {
    key: "iep",
    label: "IEP Meeting",
    orbClass: "wp-cal-orb-blue",
    pillClass: "wp-cal-evt-blue",
  },
  {
    key: "advocacy",
    label: "1:1 Advocacy",
    orbClass: "wp-cal-orb-green",
    pillClass: "wp-cal-evt-green",
  },
  {
    key: "discovery",
    label: "Discovery Call",
    orbClass: "wp-cal-orb-amber",
    pillClass: "wp-cal-evt-amber",
  },
  {
    key: "team",
    label: "Team Meeting",
    orbClass: "wp-cal-orb-purple",
    pillClass: "wp-cal-evt-purple",
  },
  {
    key: "deadline",
    label: "Deadline",
    orbClass: "wp-cal-orb-red",
    pillClass: "wp-cal-evt-red",
    showAlertIcon: true,
  },
  {
    key: "other",
    label: "Other",
    orbClass: "wp-cal-orb-silver",
    pillClass: "wp-cal-evt-silver",
  },
];

export const CALENDAR_ORB_CATEGORY_MAP: Record<CalendarOrbCategoryKey, CalendarOrbCategoryDef> =
  CALENDAR_ORB_CATEGORIES.reduce(
    (acc, item) => {
      acc[item.key] = item;
      return acc;
    },
    {} as Record<CalendarOrbCategoryKey, CalendarOrbCategoryDef>
  );

/**
 * Classifies any appointment into one of the 6 Waypoint photorealistic enamel pill categories.
 */
export function classifyAppointmentOrbCategory(apt: {
  title?: string | null;
  meetingType?: string | null;
  status?: string | null;
  isHold?: boolean;
}): CalendarOrbCategoryKey {
  const combined = `${apt.meetingType || ""} ${apt.title || ""}`.toLowerCase();
  const status = (apt.status || "").toLowerCase();

  // 1. Crimson Ruby — Deadlines, Records Due, Needs Coverage, Blackouts
  if (
    status === "needs coverage" ||
    combined.includes("deadline") ||
    combined.includes("records due") ||
    combined.includes("due date") ||
    combined.includes("blackout") ||
    combined.includes("state complaint") ||
    combined.includes("due process") ||
    combined.includes("urgent")
  ) {
    return "deadline";
  }

  // 2. Warm Amber-Gold — Discovery Calls, Parent Calls, Intake, Tentative Holds
  if (
    apt.isHold ||
    combined.includes("discovery") ||
    combined.includes("parent call") ||
    combined.includes("callback") ||
    combined.includes("intake") ||
    combined.includes("free consult") ||
    combined.includes("tentative") ||
    combined.includes("hold")
  ) {
    return "discovery";
  }

  // 3. Sapphire Blue — IEP & 504 Meetings, Eligibility, MDR, Annual Reviews
  if (
    combined.includes("iep") ||
    combined.includes("504") ||
    combined.includes("eligibility") ||
    combined.includes("manifestation") ||
    combined.includes("mdr") ||
    combined.includes("annual review") ||
    combined.includes("re-eval") ||
    combined.includes("mediation") ||
    combined.includes("resolution")
  ) {
    return "iep";
  }

  // 4. Royal Amethyst Purple — Team Meetings, Staff Check-Ins, Case Reviews, Internal Work
  if (
    combined.includes("team") ||
    combined.includes("staff") ||
    combined.includes("sync") ||
    combined.includes("case review") ||
    combined.includes("supervision") ||
    combined.includes("internal") ||
    combined.includes("training") ||
    combined.includes("workshop") ||
    combined.includes("protected") ||
    combined.includes("casework")
  ) {
    return "team";
  }

  // 5. Emerald Green — 1:1 Advocacy, Parent Advocacy, Records Review, Progress Updates, Strategy
  if (
    combined.includes("1:1") ||
    combined.includes("one-to-one") ||
    combined.includes("advocate") ||
    combined.includes("advocacy") ||
    combined.includes("parent") ||
    combined.includes("records review") ||
    combined.includes("consultation") ||
    combined.includes("strategy") ||
    combined.includes("progress") ||
    combined.includes("follow-up") ||
    combined.includes("follow up") ||
    combined.includes("session")
  ) {
    return "advocacy";
  }

  return "other";
}

/**
 * Classifies an operational block into one of the 6 orb categories (non-holiday/closure blocks).
 */
export function classifyBlockOrbCategory(block: {
  blockType?: string | null;
  title?: string | null;
  scope?: string | null;
}): CalendarOrbCategoryKey {
  const pKey = detectItemPatternKey({
    blockType: block.blockType,
    title: block.title,
    isClosure: block.scope === "ENTIRE_COMPANY" || (block.blockType || "").toLowerCase().includes("closed"),
  });

  if (pKey === "blackout" || pKey === "sick_out" || pKey === "office_closed" || pKey === "office_closure") {
    return "deadline";
  }
  if (
    pKey === "team_meeting" ||
    pKey === "internal_event" ||
    pKey === "staff_training" ||
    pKey === "protected_work"
  ) {
    return "team";
  }
  if (pKey === "proposed_hold") {
    return "discovery";
  }
  return "other";
}

/**
 * Formats an appointment into a crisp single-line parchment pill string matching Waypoint Calendar style:
 * e.g. "10:00 IEP – Emma C." or "11:00 1:1 – Noah D." or "2:00 Discovery – Cooper"
 */
export function formatParchmentPillLabel(
  apt: {
    startTime?: string | Date | null;
    endTime?: string | Date | null;
    title?: string | null;
    studentName?: string | null;
    parentName?: string | null;
    meetingType?: string | null;
    assignedAdvocateName?: string | null;
    isHold?: boolean;
  },
  loggedInAdvocateName = "Byron Honea"
): string {
  const fmt = formatWaypointCalendarEvent(apt, loggedInAdvocateName);
  const startDate = apt.startTime ? new Date(apt.startTime) : null;

  // Compact time: "10:00" or "2:30" (strip AM/PM for crisp single-line readability on Month parchment pills)
  let shortTime = "";
  if (startDate && !isNaN(startDate.getTime())) {
    const h = startDate.getHours() % 12 || 12;
    const m = String(startDate.getMinutes()).padStart(2, "0");
    shortTime = `${h}:${m}`;
  }

  // Shorten student/client name cleanly: "Emma Carter" -> "Emma C."
  let shortPerson = "";
  if (fmt.studentLabel) {
    const parts = fmt.studentLabel.trim().split(/\s+/);
    if (parts.length >= 2) {
      shortPerson = `${parts[0]} ${parts[parts.length - 1][0]}.`;
    } else {
      shortPerson = parts[0];
    }
  }

  // Build concise type label
  let shortType = fmt.sessionTypeShort;
  if (shortType === "1:1 Advocate") shortType = "1:1";
  if (apt.isHold && !shortType.toLowerCase().includes("hold")) {
    shortType = `Hold: ${shortType}`;
  }

  // If no student name (e.g. "Team Sync", "Staff Check-In", "Records Due"), show time + title directly
  if (!shortPerson) {
    const cleanTitle = (apt.title || fmt.sessionTypeFull || "Event").trim();
    const isDeadline = cleanTitle.toLowerCase().includes("due") || cleanTitle.toLowerCase().includes("deadline");
    return shortTime && !isDeadline ? `${shortTime} ${cleanTitle}` : cleanTitle;
  }

  return shortTime ? `${shortTime} ${shortType} – ${shortPerson}` : `${shortType} – ${shortPerson}`;
}
