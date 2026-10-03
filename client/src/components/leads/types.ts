import {
  getTimeInZone,
  getCallingStatus,
  detectTimeZoneFromLocation,
  getFriendlyTimeZoneName,
} from "@shared/timezones";

export const AREA_CODE_TIMEZONE_MAP: Record<string, string> = {
  // Hawaii (HST)
  "808": "Pacific/Honolulu",
  // Alaska (AKST/AKDT)
  "907": "America/Anchorage",
  // Pacific (PST/PDT)
  "206": "America/Los_Angeles", "209": "America/Los_Angeles", "213": "America/Los_Angeles",
  "253": "America/Los_Angeles", "310": "America/Los_Angeles", "323": "America/Los_Angeles",
  "360": "America/Los_Angeles", "408": "America/Los_Angeles", "415": "America/Los_Angeles",
  "425": "America/Los_Angeles", "442": "America/Los_Angeles", "503": "America/Los_Angeles",
  "509": "America/Los_Angeles", "510": "America/Los_Angeles", "530": "America/Los_Angeles",
  "541": "America/Los_Angeles", "559": "America/Los_Angeles", "562": "America/Los_Angeles",
  "619": "America/Los_Angeles", "626": "America/Los_Angeles", "628": "America/Los_Angeles",
  "650": "America/Los_Angeles", "657": "America/Los_Angeles", "661": "America/Los_Angeles",
  "669": "America/Los_Angeles", "702": "America/Los_Angeles", "707": "America/Los_Angeles",
  "714": "America/Los_Angeles", "725": "America/Los_Angeles", "747": "America/Los_Angeles",
  "760": "America/Los_Angeles", "775": "America/Los_Angeles", "805": "America/Los_Angeles",
  "818": "America/Los_Angeles", "820": "America/Los_Angeles", "831": "America/Los_Angeles",
  "858": "America/Los_Angeles", "909": "America/Los_Angeles", "916": "America/Los_Angeles",
  "925": "America/Los_Angeles", "949": "America/Los_Angeles", "951": "America/Los_Angeles",
  "971": "America/Los_Angeles",
  // Mountain (MST/MDT & Arizona)
  "303": "America/Denver", "307": "America/Denver", "385": "America/Denver",
  "406": "America/Denver", "435": "America/Denver", "480": "America/Phoenix",
  "505": "America/Denver", "520": "America/Phoenix", "575": "America/Denver",
  "602": "America/Phoenix", "623": "America/Phoenix", "719": "America/Denver",
  "720": "America/Denver", "801": "America/Denver", "928": "America/Phoenix",
  "970": "America/Denver",
  // Central (CST/CDT)
  "205": "America/Chicago", "214": "America/Chicago", "217": "America/Chicago",
  "218": "America/Chicago", "224": "America/Chicago", "225": "America/Chicago",
  "228": "America/Chicago", "251": "America/Chicago", "254": "America/Chicago",
  "256": "America/Chicago", "260": "America/Chicago", "262": "America/Chicago",
  "269": "America/Chicago", "281": "America/Chicago", "309": "America/Chicago",
  "312": "America/Chicago", "314": "America/Chicago", "316": "America/Chicago",
  "318": "America/Chicago", "319": "America/Chicago", "320": "America/Chicago",
  "325": "America/Chicago", "331": "America/Chicago", "334": "America/Chicago",
  "337": "America/Chicago", "361": "America/Chicago", "402": "America/Chicago",
  "405": "America/Chicago", "409": "America/Chicago", "414": "America/Chicago",
  "417": "America/Chicago", "423": "America/Chicago", "469": "America/Chicago",
  "479": "America/Chicago", "501": "America/Chicago", "502": "America/Chicago",
  "504": "America/Chicago", "507": "America/Chicago", "512": "America/Chicago",
  "515": "America/Chicago", "531": "America/Chicago", "563": "America/Chicago",
  "573": "America/Chicago", "580": "America/Chicago", "601": "America/Chicago",
  "605": "America/Chicago", "608": "America/Chicago", "612": "America/Chicago",
  "615": "America/Chicago", "618": "America/Chicago", "620": "America/Chicago",
  "630": "America/Chicago", "636": "America/Chicago", "641": "America/Chicago",
  "651": "America/Chicago", "660": "America/Chicago", "662": "America/Chicago",
  "701": "America/Chicago", "708": "America/Chicago", "712": "America/Chicago",
  "713": "America/Chicago", "715": "America/Chicago", "731": "America/Chicago",
  "763": "America/Chicago", "769": "America/Chicago", "773": "America/Chicago",
  "779": "America/Chicago", "815": "America/Chicago", "816": "America/Chicago",
  "817": "America/Chicago", "830": "America/Chicago", "832": "America/Chicago",
  "847": "America/Chicago", "870": "America/Chicago", "901": "America/Chicago",
  "903": "America/Chicago", "913": "America/Chicago", "918": "America/Chicago",
  "920": "America/Chicago", "931": "America/Chicago", "936": "America/Chicago",
  "940": "America/Chicago", "952": "America/Chicago", "956": "America/Chicago",
  "972": "America/Chicago", "979": "America/Chicago",
  // Eastern (EST/EDT)
  "201": "America/New_York", "202": "America/New_York", "203": "America/New_York",
  "207": "America/New_York", "212": "America/New_York", "215": "America/New_York",
  "216": "America/New_York", "239": "America/New_York", "240": "America/New_York",
  "267": "America/New_York", "301": "America/New_York", "302": "America/New_York",
  "305": "America/New_York", "315": "America/New_York", "321": "America/New_York",
  "330": "America/New_York", "336": "America/New_York", "347": "America/New_York",
  "352": "America/New_York", "386": "America/New_York", "401": "America/New_York",
  "404": "America/New_York", "407": "America/New_York", "410": "America/New_York",
  "412": "America/New_York", "413": "America/New_York", "434": "America/New_York",
  "440": "America/New_York", "443": "America/New_York", "470": "America/New_York",
  "484": "America/New_York", "516": "America/New_York", "518": "America/New_York",
  "540": "America/New_York", "561": "America/New_York", "570": "America/New_York",
  "585": "America/New_York", "603": "America/New_York", "607": "America/New_York",
  "609": "America/New_York", "610": "America/New_York", "617": "America/New_York",
  "631": "America/New_York", "646": "America/New_York", "678": "America/New_York",
  "703": "America/New_York", "704": "America/New_York", "716": "America/New_York",
  "717": "America/New_York", "718": "America/New_York", "724": "America/New_York",
  "727": "America/New_York", "732": "America/New_York", "754": "America/New_York",
  "757": "America/New_York", "770": "America/New_York", "772": "America/New_York",
  "774": "America/New_York", "781": "America/New_York", "786": "America/New_York",
  "802": "America/New_York", "803": "America/New_York", "804": "America/New_York",
  "813": "America/New_York", "814": "America/New_York", "828": "America/New_York",
  "843": "America/New_York", "845": "America/New_York", "848": "America/New_York",
  "856": "America/New_York", "857": "America/New_York", "860": "America/New_York",
  "862": "America/New_York", "864": "America/New_York", "865": "America/New_York",
  "904": "America/New_York", "908": "America/New_York", "910": "America/New_York",
  "912": "America/New_York", "914": "America/New_York", "917": "America/New_York",
  "919": "America/New_York", "929": "America/New_York", "937": "America/New_York",
  "941": "America/New_York", "954": "America/New_York", "973": "America/New_York",
  "978": "America/New_York", "980": "America/New_York", "984": "America/New_York",
};

export function getTimeZoneFromPhone(phone?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  const clean = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (clean.length < 3) return null;
  const areaCode = clean.slice(0, 3);
  return AREA_CODE_TIMEZONE_MAP[areaCode] || null;
}

export function resolveDiscoveryCallLocation(
  contact: any | undefined,
  phone?: string,
  notes?: string
): { timeZone: string; city?: string; state?: string; friendlyTz: string } {
  let timeZone: string | undefined = undefined;
  let city: string | undefined = undefined;
  let state: string | undefined = undefined;

  if (contact) {
    city = contact.city || undefined;
    state = contact.state || undefined;
    if (contact.confirmedTimeZone || contact.timezone) {
      timeZone = contact.confirmedTimeZone || contact.timezone;
    } else if (state) {
      timeZone = detectTimeZoneFromLocation(city, state, contact.zipCode || undefined).timeZone;
    }
  }

  // If not resolved from contact, check phone area code
  if (!timeZone && phone) {
    const fromPhone = getTimeZoneFromPhone(phone);
    if (fromPhone) timeZone = fromPhone;
  }

  // If still not resolved, check notes for state or city
  if (!timeZone && notes) {
    const stateMatch = notes.match(/\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/i);
    if (stateMatch) {
      state = stateMatch[1].toUpperCase();
      timeZone = detectTimeZoneFromLocation(undefined, state).timeZone;
    }
  }

  const resolvedTz = timeZone || "America/New_York";
  return {
    timeZone: resolvedTz,
    city,
    state,
    friendlyTz: getFriendlyTimeZoneName(resolvedTz),
  };
}

export const LEAD_STATUSES = [
  "New",
  "14 Day Follow-up",
  "30 Day Follow-up",
  "60 Day Follow-up",
  "90 Day Follow-up",
  "Ready for Archive",
  "Won",
  "Lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export function format12Hour(timeStr: string): string {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 || 12;
  const displayM = isNaN(m) ? "00" : String(m).padStart(2, "0");
  return `${displayH}:${displayM} ${ampm}`;
}

export function parseDiscoveryDateTime(raw: string | Date | null | undefined): {
  dateObj: Date;
  hasSpecificTime: boolean;
  timeDisplay: string;
  dateDisplay: string;
  isToday: boolean;
  isoDateStr: string;
  timeStr: string;
} {
  if (!raw) {
    const fallback = new Date();
    return {
      dateObj: fallback,
      hasSpecificTime: false,
      timeDisplay: "Time TBD",
      dateDisplay: "",
      isToday: false,
      isoDateStr: "",
      timeStr: "",
    };
  }

  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    const fallback = new Date();
    return {
      dateObj: fallback,
      hasSpecificTime: false,
      timeDisplay: "Time TBD",
      dateDisplay: "",
      isToday: false,
      isoDateStr: "",
      timeStr: "",
    };
  }

  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDate = now.getDate();

  // Detect pure UTC midnight (which happens when type="date" string was parsed in UTC)
  const isPureUtcMidnight =
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0;

  let localDate: Date;
  let hasSpecificTime: boolean;

  if (isPureUtcMidnight) {
    // When saved without time, preserve calendar year/month/date locally at default 10:00 AM
    localDate = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 10, 0, 0, 0);
    hasSpecificTime = false;
  } else {
    localDate = d;
    hasSpecificTime = !(localDate.getHours() === 0 && localDate.getMinutes() === 0);
  }

  const isToday =
    localDate.getFullYear() === todayYear &&
    localDate.getMonth() === todayMonth &&
    localDate.getDate() === todayDate;

  const hours = String(localDate.getHours()).padStart(2, "0");
  const minutes = String(localDate.getMinutes()).padStart(2, "0");
  const timeStr = hasSpecificTime ? `${hours}:${minutes}` : "";

  const yearStr = String(localDate.getFullYear());
  const monthStr = String(localDate.getMonth() + 1).padStart(2, "0");
  const dayStr = String(localDate.getDate()).padStart(2, "0");
  const isoDateStr = `${yearStr}-${monthStr}-${dayStr}`;

  const timeDisplay = hasSpecificTime
    ? localDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : "Time TBD";

  const dateDisplay = localDate.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return {
    dateObj: localDate,
    hasSpecificTime,
    timeDisplay,
    dateDisplay,
    isToday,
    isoDateStr,
    timeStr,
  };
}

export interface DiscoveryCallItem {
  id: string;
  leadId?: number;
  lead?: any;
  parentName: string;
  parentPhone?: string;
  studentName?: string;
  studentAge?: number;
  studentGrade?: string;
  inquiryReason?: string;
  date: Date;
  timeDisplay: string;
  dateDisplay: string;
  timeZone: string;
  city?: string;
  state?: string;
  friendlyTz: string;
  clientTimeInfo: ReturnType<typeof getTimeInZone>;
  callingStatus: ReturnType<typeof getCallingStatus>;
  diffHours: number;
  diffText: string;
}

export interface LeadFormData {
  source: string;
  value: string;
  status: LeadStatus;
  notes: string;
  parentName: string;
  parentPhone: string;
  studentName: string;
  studentAge: string;
  studentGrade: string;
  discoveryCallDate: string;
  discoveryCallTime: string;
}

export const emptyForm: LeadFormData = {
  source: "",
  value: "",
  status: "New",
  notes: "",
  parentName: "",
  parentPhone: "",
  studentName: "",
  studentAge: "",
  studentGrade: "",
  discoveryCallDate: "",
  discoveryCallTime: "",
};

export const getStatusColor = (status: LeadStatus): string => {
  const colors: Record<LeadStatus, string> = {
    New: "bg-[#072448]/90 border border-[#1B5799] text-[#93C5FD]",
    "14 Day Follow-up": "bg-[#2D1B00]/90 border border-[#A35900] text-[#FDE047]",
    "30 Day Follow-up": "bg-[#2D1B00]/90 border border-[#A35900] text-[#FDE047]",
    "60 Day Follow-up": "bg-[#331800]/90 border border-[#9A5B15] text-[#FDBA74]",
    "90 Day Follow-up": "bg-[#331800]/90 border border-[#9A5B15] text-[#FDBA74]",
    "Ready for Archive": "bg-[#020A17] border border-[#3A2C18] text-[#C6B697]",
    Won: "bg-[#04241B]/90 border border-[#059669] text-[#6EE7B7]",
    Lost: "bg-[#33090F]/90 border border-[#9F1239] text-[#FDA4AF]",
  };
  return colors[status] || "bg-[#020A17] border border-[#3A2C18] text-[#C6B697]";
};
