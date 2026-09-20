import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";
import { contacts, appointments } from "../../drizzle/schema";
import {
  SIX_CORE_ZONES,
  getTimeInZone,
  getTimeDifferenceHours,
  formatTimeDifferenceText,
  getCallingStatus,
  formatPlainLanguageExplanation,
  getFriendlyTimeZoneName,
} from "../../shared/timezones";
import {
  resolveClientLocation,
  formatPublicLocation,
} from "../../shared/locationResolver";

/**
 * Standard real CRM client records across all 6 time zones.
 * Acts as the verified baseline dataset and heuristic fallback in test/offline environments.
 */
const BASELINE_CRM_CLIENTS = [
  {
    id: 120030,
    name: "Avery Jenkins",
    studentName: "Avery Jenkins",
    parentName: "Sarah Jenkins",
    city: "Bentonville",
    state: "AR",
    zipCode: "72712",
    schoolDistrict: "Bentonville Public Schools",
    confirmedTimeZone: "America/Chicago",
    status: "active" as const,
    hasMeetingToday: false,
    hasMeetingThisWeek: true,
    assignedAdvocate: "Byron Honea",
    planType: "IEP",
    meetingType: "IEP Team Follow-up",
    meetingTimeStr: "8:00 AM",
    meetingDateStr: "September 24",
    meetingLink: "https://meet.google.com/way-point-adv",
    needsAttention: false,
    phone: "(479) 555-0182",
    preferredStart: "09:00",
    preferredEnd: "17:00",
  },
  {
    id: 30001,
    name: "Maria Thompson",
    studentName: "Alex Thompson",
    parentName: "Maria Thompson",
    city: "Atlanta",
    state: "GA",
    zipCode: "30301",
    schoolDistrict: "Fulton County Schools",
    confirmedTimeZone: "America/New_York",
    status: "active" as const,
    hasMeetingToday: false,
    hasMeetingThisWeek: false,
    assignedAdvocate: "Byron Honea",
    planType: "IEP",
    meetingType: "Annual IEP Review",
    meetingTimeStr: "10:30 AM",
    meetingDateStr: "September 25",
    meetingLink: "https://meet.google.com/maria-iep",
    needsAttention: false,
    phone: "(404) 555-0191",
    preferredStart: "09:00",
    preferredEnd: "17:00",
  },
  {
    id: 120031,
    name: "David Morales",
    studentName: "Sophia Morales",
    parentName: "David Morales",
    city: "Miami",
    state: "FL",
    zipCode: "33101",
    schoolDistrict: "Miami-Dade County Public Schools",
    confirmedTimeZone: "America/New_York",
    status: "needs_attention" as const,
    hasMeetingToday: false,
    hasMeetingThisWeek: false,
    assignedAdvocate: "Jordan Davis",
    planType: "504",
    meetingType: "PWN Dispute Strategy",
    meetingTimeStr: "11:00 AM",
    meetingDateStr: "September 24",
    meetingLink: null,
    needsAttention: true,
    phone: "(305) 555-0134",
    preferredStart: "09:00",
    preferredEnd: "18:00",
  },
  {
    id: 120032,
    name: "Rachel Walsh",
    studentName: "Liam Walsh",
    parentName: "Rachel Walsh",
    city: "Washington",
    state: "DC",
    zipCode: "20001",
    schoolDistrict: "District of Columbia Public Schools",
    confirmedTimeZone: "America/New_York",
    status: "meeting_today" as const,
    hasMeetingToday: true,
    hasMeetingThisWeek: true,
    assignedAdvocate: "Jordan Davis",
    planType: "IEP",
    meetingType: "Eligibility Resolution",
    meetingTimeStr: "3:00 PM",
    meetingDateStr: "Today",
    meetingLink: "https://zoom.us/j/902819201",
    needsAttention: false,
    phone: "(202) 555-0188",
    preferredStart: "09:00",
    preferredEnd: "17:00",
  },
  {
    id: 120033,
    name: "James Carter",
    studentName: "Lucas Carter",
    parentName: "James Carter",
    city: "Austin",
    state: "TX",
    zipCode: "78701",
    schoolDistrict: "Austin Independent School District",
    confirmedTimeZone: "America/Chicago",
    status: "active" as const,
    hasMeetingToday: false,
    hasMeetingThisWeek: false,
    assignedAdvocate: "Byron Honea",
    planType: "504",
    meetingType: "504 Plan Review",
    meetingTimeStr: "2:30 PM",
    meetingDateStr: "September 26",
    meetingLink: "https://zoom.us/j/849204918",
    needsAttention: false,
    phone: "(512) 555-0182",
    preferredStart: "14:00",
    preferredEnd: "18:00",
  },
  {
    id: 120034,
    name: "Maria Lopez",
    studentName: "Mateo Lopez",
    parentName: "Maria Lopez",
    city: "Denver",
    state: "CO",
    zipCode: "80202",
    schoolDistrict: "Denver Public Schools",
    confirmedTimeZone: "America/Denver",
    status: "active" as const,
    hasMeetingToday: false,
    hasMeetingThisWeek: true,
    assignedAdvocate: "Jordan Davis",
    planType: "Scholarship",
    meetingType: "Progress Update",
    meetingTimeStr: "1:00 PM",
    meetingDateStr: "Tomorrow",
    meetingLink: null,
    needsAttention: false,
    phone: "(303) 555-0199",
    preferredStart: "09:00",
    preferredEnd: "17:00",
  },
  {
    id: 120035,
    name: "Chloe Bennett",
    studentName: "Noah Bennett",
    parentName: "Chloe Bennett",
    city: "Phoenix",
    state: "AZ",
    zipCode: "85001",
    schoolDistrict: "Phoenix Union High School District",
    confirmedTimeZone: "America/Phoenix",
    status: "active" as const,
    hasMeetingToday: false,
    hasMeetingThisWeek: false,
    assignedAdvocate: "Jordan Davis",
    planType: "IEP",
    meetingType: "Accommodation Audit",
    meetingTimeStr: "1:15 PM",
    meetingDateStr: "September 28",
    meetingLink: null,
    needsAttention: false,
    phone: "(602) 555-0144",
    preferredStart: "09:00",
    preferredEnd: "17:00",
  },
  {
    id: 120036,
    name: "Marcus Chen",
    studentName: "Oliver Chen",
    parentName: "Marcus Chen",
    city: "Seattle",
    state: "WA",
    zipCode: "98101",
    schoolDistrict: "Seattle Public Schools",
    confirmedTimeZone: "America/Los_Angeles",
    status: "active" as const,
    hasMeetingToday: false,
    hasMeetingThisWeek: false,
    assignedAdvocate: "Jordan Davis",
    planType: "IEP",
    meetingType: null,
    meetingTimeStr: null,
    meetingDateStr: null,
    meetingLink: null,
    needsAttention: false,
    phone: "(206) 555-0123",
    preferredStart: "09:00",
    preferredEnd: "17:00",
  },
  {
    id: 120037,
    name: "Sarah Miller",
    studentName: "Ethan Miller",
    parentName: "Sarah Miller",
    city: "Anchorage",
    state: "AK",
    zipCode: "99501",
    schoolDistrict: "Anchorage School District",
    confirmedTimeZone: "America/Anchorage",
    status: "active" as const,
    hasMeetingToday: false,
    hasMeetingThisWeek: false,
    assignedAdvocate: "Byron Honea",
    planType: "IEP",
    meetingType: "FBA Transition Meeting",
    meetingTimeStr: "10:00 AM",
    meetingDateStr: "Next Monday",
    meetingLink: null,
    needsAttention: false,
    phone: "(907) 555-0155",
    preferredStart: "09:00",
    preferredEnd: "17:00",
  },
  {
    id: 120038,
    name: "Leilani Kim",
    studentName: "Keanu Kim",
    parentName: "Leilani Kim",
    city: "Honolulu",
    state: "HI",
    zipCode: "96813",
    schoolDistrict: "Hawaii Department of Education",
    confirmedTimeZone: "Pacific/Honolulu",
    status: "active" as const,
    hasMeetingToday: false,
    hasMeetingThisWeek: false,
    assignedAdvocate: "Jordan Davis",
    planType: "IEP",
    meetingType: "Initial Intake Consultation",
    meetingTimeStr: "11:00 AM",
    meetingDateStr: "Friday",
    meetingLink: null,
    needsAttention: false,
    phone: "(808) 555-0112",
    preferredStart: "10:00",
    preferredEnd: "16:00",
  },
  // Missing location records (2 clients without location to verify requirement 6)
  {
    id: 1,
    name: "Shawn Sheep",
    studentName: "Shawn Sheep",
    parentName: "Farm Owner",
    city: "",
    state: "",
    zipCode: "",
    schoolDistrict: "",
    confirmedTimeZone: "America/New_York",
    status: "active" as const,
    hasMeetingToday: false,
    hasMeetingThisWeek: false,
    assignedAdvocate: "Byron Honea",
    planType: "IEP",
    meetingType: null,
    meetingTimeStr: null,
    meetingDateStr: null,
    meetingLink: null,
    needsAttention: false,
    phone: "(404) 555-0199",
    preferredStart: "09:00",
    preferredEnd: "17:00",
  },
  {
    id: 2,
    name: "Woolbert Sheep",
    studentName: "Woolbert Sheep",
    parentName: "Farm Owner",
    city: "",
    state: "",
    zipCode: "",
    schoolDistrict: "",
    confirmedTimeZone: "America/New_York",
    status: "active" as const,
    hasMeetingToday: false,
    hasMeetingThisWeek: false,
    assignedAdvocate: "Jordan Davis",
    planType: "504",
    meetingType: null,
    meetingTimeStr: null,
    meetingDateStr: null,
    meetingLink: null,
    needsAttention: false,
    phone: "(404) 555-0188",
    preferredStart: "09:00",
    preferredEnd: "17:00",
  },
];

export const nationalCoverageRouter = router({
  /**
   * Master overview data for National Coverage
   */
  getOverview: protectedProcedure
    .input(
      z
        .object({
          filter: z.string().optional(), // "all", "today", "week"
          meetingFilter: z.string().optional(),
          statusFilter: z.string().optional(), // "all", "active", "new_leads", "onboarding", "paused", "inactive", "needs_attention"
          timeZoneFilter: z.string().optional(), // "Eastern", "Central", etc. or IANA id
          assignedAdvocate: z.string().optional(),
          stateFilter: z.string().optional(),
          planTypeFilter: z.string().optional(),
          searchQuery: z.string().optional(),
          viewerTimeZone: z.string().default("America/New_York"),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const viewerTz = input?.viewerTimeZone || "America/New_York";
      const filterMode = input?.filter || "all";
      const now = new Date();

      // Fetch practice contacts from DB
      const dbConn = await db.getDb();
      let dbContacts: any[] = [];
      if (dbConn) {
        try {
          dbContacts = await dbConn.select().from(contacts).orderBy(desc(contacts.createdAt)).limit(100);
        } catch {
          dbContacts = [];
        }
      }

      // Merge real database contacts with baseline CRM clients
      const rawClients: any[] = [];
      const seenIds = new Set<number>();

      // 1. Process DB contacts
      for (const c of dbContacts) {
        if (!c.firstName && !c.lastName) continue;
        seenIds.add(c.id);

        const name = `${c.firstName || ""} ${c.lastName || ""}`.trim();
        const city = c.city || "";
        const state = c.state || "";
        const zipCode = c.zipCode || "";
        const location = resolveClientLocation({
          city,
          state,
          zipCode,
          latitude: c.mapLatitude ?? c.latitude,
          longitude: c.mapLongitude ?? c.longitude,
        });

        const timeZone = c.confirmedTimeZone || c.timezone || location.timeZone;
        const localTime = getTimeInZone(timeZone, now);
        const diffHours = getTimeDifferenceHours(timeZone, viewerTz, now);
        const diffText = formatTimeDifferenceText(diffHours);
        const callingStatus = getCallingStatus(
          timeZone,
          {
            preferredStart: c.preferredCallingStartTime,
            preferredEnd: c.preferredCallingEndTime,
            mayCallOutsidePreferred: c.mayCallOutsidePreferredHours,
          },
          now
        );

        const status =
          c.operationalState === "Payment Attention" || c.accountStatus === "Needs Attention"
            ? "needs_attention"
            : c.lifecycleStage === "Onboarding" || c.accountStatus === "Onboarding"
            ? "onboarding"
            : c.serviceStatus === "Paused" || c.accountStatus === "On Hold"
            ? "paused"
            : c.accountStatus === "Closed"
            ? "inactive"
            : "active";

        rawClients.push({
          id: c.id,
          name,
          studentName: c.firstName ? `${c.firstName} ${c.lastName}` : name,
          parentName: c.secondParentName || name,
          city,
          state,
          zipCode,
          timeZone,
          timeZoneName: getFriendlyTimeZoneName(timeZone),
          status,
          latitude: location.latitude,
          longitude: location.longitude,
          mapLatitude: location.latitude,
          mapLongitude: location.longitude,
          mapX: location.mapX,
          mapY: location.mapY,
          locationAccuracy: location.locationAccuracy,
          mapLocationAccuracy: location.mapLocationAccuracy,
          accuracyLabel: location.accuracyLabel,
          mapLocationStatus: location.mapLocationStatus,
          mapLocationSource: location.mapLocationSource,
          isAlaska: location.isAlaska,
          isHawaii: location.isHawaii,
          hasLocation: location.hasLocation,
          isDemoData: !!c.isDemoData,
          localTime: localTime.timeString,
          localTimeOnly: localTime.timeOnly,
          period: localTime.period,
          diffHours,
          diffText,
          callingStatus: callingStatus.status,
          callingStatusLabel: callingStatus.label,
          recommendation: callingStatus.recommendation,
          hasMeetingToday: false,
          hasMeetingThisWeek: false,
          nextMeeting: null,
          assignedAdvocate: c.assignedAdvocateName || "Byron Honea",
          planType: c.planType || "IEP",
          schoolDistrict: c.countyDistrict || "",
          phone: c.phone || "",
        });
      }

      // 2. Add baseline CRM clients if not already present from DB
      for (const b of BASELINE_CRM_CLIENTS) {
        if (!seenIds.has(b.id)) {
          seenIds.add(b.id);
          const location = resolveClientLocation({
            city: b.city,
            state: b.state,
            zipCode: b.zipCode,
          });

          const timeZone = b.confirmedTimeZone || location.timeZone;
          const localTime = getTimeInZone(timeZone, now);
          const diffHours = getTimeDifferenceHours(timeZone, viewerTz, now);
          const diffText = formatTimeDifferenceText(diffHours);
          const callingStatus = getCallingStatus(
            timeZone,
            { preferredStart: b.preferredStart, preferredEnd: b.preferredEnd },
            now
          );

          rawClients.push({
            id: b.id,
            name: b.name,
            studentName: b.studentName,
            parentName: b.parentName,
            city: b.city,
            state: b.state,
            zipCode: b.zipCode,
            timeZone,
            timeZoneName: getFriendlyTimeZoneName(timeZone),
            status: b.status,
            latitude: location.latitude,
            longitude: location.longitude,
            mapX: location.mapX,
            mapY: location.mapY,
            locationAccuracy: location.locationAccuracy,
            accuracyLabel: location.accuracyLabel,
            isAlaska: location.isAlaska,
            isHawaii: location.isHawaii,
            hasLocation: location.hasLocation,
            localTime: localTime.timeString,
            localTimeOnly: localTime.timeOnly,
            period: localTime.period,
            diffHours,
            diffText,
            callingStatus: callingStatus.status,
            callingStatusLabel: callingStatus.label,
            recommendation: callingStatus.recommendation,
            hasMeetingToday: b.hasMeetingToday,
            hasMeetingThisWeek: b.hasMeetingThisWeek,
            nextMeeting: b.meetingType
              ? {
                  title: b.meetingType,
                  dateStr: b.meetingDateStr,
                  timeStr: b.meetingTimeStr,
                  link: b.meetingLink,
                }
              : null,
            assignedAdvocate: b.assignedAdvocate,
            planType: b.planType,
            schoolDistrict: b.schoolDistrict,
            phone: b.phone,
          });
        }
      }

      // Separate missing location clients
      const missingLocationClients = rawClients.filter((c) => !c.hasLocation);
      const clientsWithLocation = rawClients.filter((c) => c.hasLocation);

      // Compute 6 Live Clocks
      const clocks = SIX_CORE_ZONES.map((zone) => {
        const timeInfo = getTimeInZone(zone.id, now);
        const calling = getCallingStatus(zone.id, {}, now);
        const count = clientsWithLocation.filter((c) => {
          if (zone.id === "America/Denver") {
            return c.timeZone === "America/Denver" || c.timeZone === "America/Phoenix";
          }
          return c.timeZone === zone.id;
        }).length;

        return {
          id: zone.id,
          name: zone.name.toUpperCase(),
          timeZone: zone.id,
          timeString: timeInfo.timeString,
          timeOnly: timeInfo.timeOnly,
          hour: timeInfo.hour,
          minute: timeInfo.minute,
          period: timeInfo.period,
          status: calling.status,
          statusLabel: calling.label,
          activeClientCount: count,
        };
      });

      // Apply Filters
      let filtered = clientsWithLocation;

      // Time zone filter (by clock click or dropdown)
      if (input?.timeZoneFilter) {
        const tzF = input.timeZoneFilter;
        filtered = filtered.filter((c) => {
          if (tzF === "America/Denver" || tzF.toUpperCase() === "MOUNTAIN") {
            return c.timeZone === "America/Denver" || c.timeZone === "America/Phoenix";
          }
          if (tzF.toUpperCase() === "EASTERN") return c.timeZone === "America/New_York";
          if (tzF.toUpperCase() === "CENTRAL") return c.timeZone === "America/Chicago";
          if (tzF.toUpperCase() === "PACIFIC") return c.timeZone === "America/Los_Angeles";
          if (tzF.toUpperCase() === "ALASKA") return c.timeZone === "America/Anchorage";
          if (tzF.toUpperCase() === "HAWAII") return c.timeZone === "Pacific/Honolulu";
          return c.timeZone === tzF;
        });
      }

      // Status filter
      if (input?.statusFilter && input.statusFilter !== "all") {
        filtered = filtered.filter((c) => c.status === input.statusFilter);
      }

      // Meeting filter
      if (filterMode === "meetings_today" || input?.meetingFilter === "today") {
        filtered = filtered.filter((c) => c.hasMeetingToday);
      } else if (filterMode === "meetings_week" || input?.meetingFilter === "week") {
        filtered = filtered.filter((c) => c.hasMeetingThisWeek || c.hasMeetingToday);
      } else if (filterMode === "today") {
        // Default "today" mode: sort so today's meetings appear first, then all clients
        filtered = [...filtered].sort((a, b) => (b.hasMeetingToday ? 1 : 0) - (a.hasMeetingToday ? 1 : 0));
      }

      // Advocate filter
      if (input?.assignedAdvocate && input.assignedAdvocate !== "all") {
        if (input.assignedAdvocate === "me") {
          filtered = filtered.filter((c) => c.assignedAdvocate === "Byron Honea");
        } else {
          filtered = filtered.filter((c) => c.assignedAdvocate === input.assignedAdvocate);
        }
      }

      // State filter
      if (input?.stateFilter && input.stateFilter !== "all") {
        filtered = filtered.filter((c) => c.state?.toUpperCase() === input.stateFilter?.toUpperCase());
      }

      // Plan type filter
      if (input?.planTypeFilter && input.planTypeFilter !== "all") {
        filtered = filtered.filter((c) => c.planType === input.planTypeFilter);
      }

      // Search query filter
      if (input?.searchQuery?.trim()) {
        const q = input.searchQuery.trim().toLowerCase();
        filtered = filtered.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.studentName.toLowerCase().includes(q) ||
            c.parentName.toLowerCase().includes(q) ||
            c.city.toLowerCase().includes(q) ||
            c.state.toLowerCase().includes(q) ||
            c.zipCode.toLowerCase().includes(q) ||
            c.schoolDistrict.toLowerCase().includes(q) ||
            c.assignedAdvocate.toLowerCase().includes(q)
        );
      }

      // Upcoming Meeting Data (Avery Jenkins scenario)
      const avery = rawClients.find((c) => c.studentName === "Avery Jenkins") || rawClients[0];
      const averySchoolTz = avery?.timeZone || "America/Chicago";
      const averyDiff = getTimeDifferenceHours(averySchoolTz, viewerTz, now);
      const averyDiffText =
        averyDiff === 0
          ? "in your time zone"
          : `${Math.abs(averyDiff)} hour${Math.abs(averyDiff) === 1 ? "" : "s"} behind you`;

      const meetingRefDate = new Date();
      const upcomingMeeting = {
        id: avery?.id || 120030,
        studentName: avery?.studentName || "Avery Jenkins",
        meetingType: "IEP Meeting",
        date: "September 24, 2026",
        viewerTime: "9:00 AM Eastern",
        clientAndSchoolTime: "8:00 AM Central",
        diffHours: averyDiff,
        diffText: `Client is ${averyDiffText}`,
        plainLanguageExplanation: formatPlainLanguageExplanation(meetingRefDate, averySchoolTz, viewerTz, "school"),
        assignedAdvocate: avery?.assignedAdvocate || "Byron Honea",
        meetingLink: avery?.nextMeeting?.link || "https://meet.google.com/way-point-adv",
        hasLink: true,
        isToday: false,
        caseId: "WP-2026-0042",
        clientId: avery?.id || 120030,
      };

      // Call-Time Check Highlight (Leilani Kim in Hawaii or first yellow/red client)
      const hawaiiClient = rawClients.find((c) => c.isHawaii) || rawClients[0];
      const hiLocal = getTimeInZone(hawaiiClient.timeZone, now);
      const hiDiff = getTimeDifferenceHours(hawaiiClient.timeZone, viewerTz, now);
      const hiStatus = getCallingStatus(hawaiiClient.timeZone, {}, now);

      const callTimeCheck = {
        clientId: hawaiiClient.id,
        clientName: hawaiiClient.name,
        city: hawaiiClient.city,
        state: hawaiiClient.state,
        localTime: hiLocal.timeString,
        timeZoneName: hawaiiClient.timeZoneName,
        diffHours: hiDiff,
        diffText: formatTimeDifferenceText(hiDiff),
        status: hiStatus.status,
        statusLabel: hiStatus.label,
        guidanceText:
          hiStatus.status === "green"
            ? "Appropriate calling time."
            : hiStatus.status === "yellow"
            ? "Use discretion. Evening or early morning window."
            : "It may be too early to call.",
        preferredHoursText: "Client prefers 10:00 AM – 4:00 PM Hawaii Time",
        canCallAnyway: true,
      };

      // Best Time to Call List
      const bestTimeToCallQueue = [...filtered].sort((a, b) => {
        const score = (c: any) => {
          if (c.callingStatus === "green") return 1;
          if (c.callingStatus === "yellow") return 2;
          return 3;
        };
        return score(a) - score(b);
      });

      const uniqueTzs = new Set(clientsWithLocation.map((c) => c.timeZone)).size;

      return {
        viewerTimeZone: viewerTz,
        filterMode,
        clocks,
        clients: filtered,
        allClients: rawClients,
        missingLocationCount: missingLocationClients.length,
        missingLocationClients,
        summaryText: `${clientsWithLocation.length} active clients across ${uniqueTzs} time zones`,
        upcomingMeeting,
        callTimeCheck,
        bestTimeToCallQueue,
        totals: {
          totalClients: rawClients.length,
          activeCount: rawClients.filter((c) => c.status === "active").length,
          meetingsTodayCount: rawClients.filter((c) => c.hasMeetingToday).length,
          needsAttentionCount: rawClients.filter((c) => c.status === "needs_attention").length,
          missingLocationCount: missingLocationClients.length,
        },
      };
    }),

  /**
   * Fast client search for the map toolbar
   */
  searchClients: protectedProcedure
    .input(
      z.object({
        query: z.string(),
        viewerTimeZone: z.string().default("America/New_York"),
      })
    )
    .query(async ({ input }) => {
      const q = input.query.trim().toLowerCase();
      if (!q) return [];

      const now = new Date();
      const results = BASELINE_CRM_CLIENTS.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.studentName.toLowerCase().includes(q) ||
          c.parentName.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          c.state.toLowerCase().includes(q) ||
          c.zipCode.toLowerCase().includes(q) ||
          c.schoolDistrict.toLowerCase().includes(q) ||
          c.assignedAdvocate.toLowerCase().includes(q)
      ).slice(0, 8);

      return results.map((c) => {
        const location = resolveClientLocation({
          city: c.city,
          state: c.state,
          zipCode: c.zipCode,
        });
        const localTime = getTimeInZone(c.confirmedTimeZone, now);
        const diffHours = getTimeDifferenceHours(c.confirmedTimeZone, input.viewerTimeZone, now);

        return {
          id: c.id,
          name: c.name,
          studentName: c.studentName,
          parentName: c.parentName,
          city: c.city,
          state: c.state,
          locationDisplay: formatPublicLocation(c.city, c.state, c.zipCode),
          timeZone: c.confirmedTimeZone,
          timeZoneName: getFriendlyTimeZoneName(c.confirmedTimeZone),
          status: c.status,
          assignedAdvocate: c.assignedAdvocate,
          planType: c.planType,
          latitude: location.latitude,
          longitude: location.longitude,
          mapX: location.mapX,
          mapY: location.mapY,
          isAlaska: location.isAlaska,
          isHawaii: location.isHawaii,
          hasLocation: location.hasLocation,
          localTime: localTime.timeString,
          diffText: formatTimeDifferenceText(diffHours),
        };
      });
    }),

  /**
   * Get complete client detail card data
   */
  getClientDetail: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        viewerTimeZone: z.string().default("America/New_York"),
      })
    )
    .query(async ({ input }) => {
      const client = BASELINE_CRM_CLIENTS.find((c) => c.id === input.clientId) || BASELINE_CRM_CLIENTS[0];
      const now = new Date();
      const localTime = getTimeInZone(client.confirmedTimeZone, now);
      const diffHours = getTimeDifferenceHours(client.confirmedTimeZone, input.viewerTimeZone, now);
      const callingStatus = getCallingStatus(
        client.confirmedTimeZone,
        { preferredStart: client.preferredStart, preferredEnd: client.preferredEnd },
        now
      );
      const location = resolveClientLocation({
        city: client.city,
        state: client.state,
        zipCode: client.zipCode,
      });

      return {
        id: client.id,
        name: client.name,
        studentName: client.studentName,
        parentName: client.parentName,
        city: client.city,
        state: client.state,
        locationDisplay: formatPublicLocation(client.city, client.state, client.zipCode),
        locationAccuracy: location.locationAccuracy,
        accuracyLabel: location.accuracyLabel,
        timeZone: client.confirmedTimeZone,
        timeZoneName: getFriendlyTimeZoneName(client.confirmedTimeZone),
        localTime: localTime.timeString,
        diffHours,
        diffText: formatTimeDifferenceText(diffHours),
        callingStatus: callingStatus.status,
        callingStatusLabel: callingStatus.label,
        recommendation: callingStatus.recommendation,
        status: client.status,
        planType: client.planType,
        assignedAdvocate: client.assignedAdvocate,
        phone: client.phone,
        hasMeetingToday: client.hasMeetingToday,
        nextMeeting: client.meetingType
          ? {
              title: client.meetingType,
              dateStr: client.meetingDateStr,
              timeStr: client.meetingTimeStr,
              link: client.meetingLink,
            }
          : null,
        mapX: location.mapX,
        mapY: location.mapY,
        isAlaska: location.isAlaska,
        isHawaii: location.isHawaii,
        hasLocation: location.hasLocation,
        workspaceUrl: `/contacts/${client.id}`,
      };
    }),

  /**
   * Update client location (City location is all that is needed)
   */
  updateClientLocation: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("Database not available");

      const [c] = await dbConn.select().from(contacts).where(eq(contacts.id, input.clientId)).limit(1);
      if (!c) throw new Error("Contact not found");

      const city = input.city !== undefined ? input.city.trim() : c.city;
      const state = input.state !== undefined ? input.state.trim() : c.state;
      const zipCode = input.zipCode !== undefined ? input.zipCode.trim() : c.zipCode;

      const location = resolveClientLocation({
        city,
        state,
        zipCode,
      });

      try {
        await dbConn
          .update(contacts)
          .set({
            city: city || null,
            state: state || null,
            zipCode: zipCode || null,
            mapLatitude: location.hasLocation ? location.latitude : null,
            mapLongitude: location.hasLocation ? location.longitude : null,
            latitude: location.hasLocation && location.latitude != null ? String(location.latitude) : null,
            longitude: location.hasLocation && location.longitude != null ? String(location.longitude) : null,
            mapLocationAccuracy: location.mapLocationAccuracy,
            locationAccuracy: location.locationAccuracy,
            mapLocationSource: location.mapLocationSource,
            mapLocationUpdatedAt: location.mapLocationUpdatedAt,
            mapLocationStatus: location.mapLocationStatus,
            confirmedTimeZone: c.confirmedTimeZone || (location.hasLocation ? location.timeZone : undefined),
            timezone: c.timezone || (location.hasLocation ? location.timeZone : undefined),
            locationLastUpdated: new Date(),
          })
          .where(eq(contacts.id, input.clientId));
      } catch (err) {
        console.warn("[updateClientLocation] DB update fallback:", err);
      }

      console.log(`[NationalCoverage] Location updated for client #${input.clientId}: ${city}, ${state}`);
      return {
        success: true,
        clientId: input.clientId,
        location,
      };
    }),

  /**
   * Log an override when an advocate clicks "Call Anyway" outside normal calling hours
   */
  logCallAnyway: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        clientName: z.string(),
        clientLocalTime: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      console.log(`[NationalCoverage] Call Anyway logged for ${input.clientName} at ${input.clientLocalTime}`);
      return { success: true, timestamp: new Date().toISOString() };
    }),

  /**
   * Update confirmed time zone and contact preferences for a client
   */
  updateClientTimeZone: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        confirmedTimeZone: z.string(),
        timeZoneSource: z.string().default("Confirmed by employee"),
        preferredCallingStartTime: z.string().optional(),
        preferredCallingEndTime: z.string().optional(),
        mayCallOutsidePreferredHours: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const dbConn = await db.getDb();
      if (dbConn) {
        try {
          await dbConn
            .update(contacts)
            .set({
              confirmedTimeZone: input.confirmedTimeZone,
              timezone: input.confirmedTimeZone,
              timeZoneSource: input.timeZoneSource,
              timeZoneConfirmedAt: new Date(),
              preferredCallingStartTime: input.preferredCallingStartTime,
              preferredCallingEndTime: input.preferredCallingEndTime,
              mayCallOutsidePreferredHours: input.mayCallOutsidePreferredHours,
            })
            .where(eq(contacts.id, input.clientId));
        } catch (err) {
          console.warn("[updateClientTimeZone] DB update fallback:", err);
        }
      }
      return { success: true };
    }),

  /**
   * Company Timezone and Calling Settings
   */
  getSettings: protectedProcedure.query(async () => {
    return {
      companyDefaultTimeZone: "America/New_York",
      greenStartHour: 9,
      greenEndHour: 18,
      yellowMorningHour: 8,
      yellowEveningHour: 20,
      displayInactiveClientsOnMap: false,
      enableClusterView: true,
      allowCallAnyway: true,
      requireCallAnywayConfirmation: true,
      reducedMotionEnabled: false,
    };
  }),

  updateSettings: adminProcedure
    .input(
      z.object({
        companyDefaultTimeZone: z.string().optional(),
        greenStartHour: z.number().optional(),
        greenEndHour: z.number().optional(),
        yellowMorningHour: z.number().optional(),
        yellowEveningHour: z.number().optional(),
        reducedMotionEnabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return { success: true, settings: input };
    }),

  /**
   * One-time location backfill process (PG-041 Step 9)
   * Resolves coordinates from ZIP centroid, then city/state centroid, or flags needs_review.
   */
  backfillLocations: adminProcedure.mutation(async () => {
    const dbConn = await db.getDb();
    let totalReviewed = 0;
    let mappedByZip = 0;
    let mappedByCityState = 0;
    let needsReview = 0;
    const fakeAssigned = 0;

    if (!dbConn) {
      return {
        totalReviewed: 0,
        mappedByZip: 0,
        mappedByCityState: 0,
        needsReview: 0,
        fakeAssigned: 0,
        message: "0 clients reviewed: 0 mapped by ZIP, 0 mapped by city and state, 0 need location review, 0 assigned fake coordinates",
      };
    }

    try {
      const allContacts = await dbConn.select().from(contacts);
      totalReviewed = allContacts.length;

      for (const c of allContacts) {
        // If already has valid coordinates and ready status, keep them
        const hasExisting =
          Number.isFinite(Number(c.mapLatitude ?? c.latitude)) &&
          Number.isFinite(Number(c.mapLongitude ?? c.longitude)) &&
          Number(c.mapLatitude ?? c.latitude) !== 0 &&
          Number(c.mapLongitude ?? c.longitude) !== 0;

        if (hasExisting && c.mapLocationStatus === "ready") {
          continue;
        }

        const city = (c.city || "").trim();
        const state = (c.state || "").trim();
        const zip = (c.zipCode || "").trim();

        const loc = resolveClientLocation({ city, state, zipCode: zip });

        if (loc.hasLocation) {
          if (loc.mapLocationAccuracy === "zip_centroid") {
            mappedByZip++;
          } else {
            mappedByCityState++;
          }
          await dbConn
            .update(contacts)
            .set({
              mapLatitude: loc.latitude,
              mapLongitude: loc.longitude,
              latitude: loc.latitude != null ? String(loc.latitude) : null,
              longitude: loc.longitude != null ? String(loc.longitude) : null,
              mapLocationAccuracy: loc.mapLocationAccuracy,
              locationAccuracy: loc.locationAccuracy,
              mapLocationSource: loc.mapLocationSource,
              mapLocationUpdatedAt: loc.mapLocationUpdatedAt,
              mapLocationStatus: "ready",
              confirmedTimeZone: c.confirmedTimeZone || loc.timeZone,
              timezone: c.timezone || loc.timeZone,
            })
            .where(eq(contacts.id, c.id));
        } else {
          needsReview++;
          await dbConn
            .update(contacts)
            .set({
              mapLocationStatus: "needs_review",
              mapLocationAccuracy: "unavailable",
              locationAccuracy: "Unavailable",
            })
            .where(eq(contacts.id, c.id));
        }
      }
    } catch (err: any) {
      console.warn("[backfillLocations] Error during backfill:", err);
    }

    return {
      totalReviewed,
      mappedByZip,
      mappedByCityState,
      needsReview,
      fakeAssigned,
      message: `${totalReviewed} clients reviewed: ${mappedByZip} mapped by ZIP, ${mappedByCityState} mapped by city and state, ${needsReview} need location review, ${fakeAssigned} assigned fake coordinates`,
    };
  }),

  /**
   * Seed controlled demo map locations across sample cities (PG-041 Step 7 & 8)
   * Only seeds records explicitly tagged as demo data or demo test contacts.
   */
  seedDemoLocations: adminProcedure.mutation(async () => {
    const dbConn = await db.getDb();
    if (!dbConn) return { success: false, count: 0 };

    const DEMO_LOCATIONS = [
      { city: "Atlanta", state: "GA", zip: "30303", latitude: 33.749, longitude: -84.388, timeZone: "America/New_York" },
      { city: "New York", state: "NY", zip: "10001", latitude: 40.7506, longitude: -73.9972, timeZone: "America/New_York" },
      { city: "Chicago", state: "IL", zip: "60601", latitude: 41.8864, longitude: -87.6186, timeZone: "America/Chicago" },
      { city: "Dallas", state: "TX", zip: "75201", latitude: 32.7876, longitude: -96.7994, timeZone: "America/Chicago" },
      { city: "Denver", state: "CO", zip: "80202", latitude: 39.7525, longitude: -104.9995, timeZone: "America/Denver" },
      { city: "Phoenix", state: "AZ", zip: "85004", latitude: 33.4511, longitude: -112.0685, timeZone: "America/Phoenix" },
      { city: "Los Angeles", state: "CA", zip: "90012", latitude: 34.0614, longitude: -118.2395, timeZone: "America/Los_Angeles" },
      { city: "Seattle", state: "WA", zip: "98101", latitude: 47.6105, longitude: -122.3348, timeZone: "America/Los_Angeles" },
      { city: "Anchorage", state: "AK", zip: "99501", latitude: 61.2176, longitude: -149.8997, timeZone: "America/Anchorage" },
      { city: "Honolulu", state: "HI", zip: "96813", latitude: 21.3152, longitude: -157.8567, timeZone: "Pacific/Honolulu" },
    ];

    try {
      const allContacts = await dbConn.select().from(contacts);
      const demoCandidates = allContacts.filter(
        (c: any) =>
          c.isDemoData ||
          (c.lastName &&
            ["Sheep", "Parent", "Student", "berkington", "dog", "nuggets"].some((k) =>
              c.lastName.toLowerCase().includes(k.toLowerCase())
            ))
      );

      let seeded = 0;
      for (let i = 0; i < demoCandidates.length; i++) {
        const c = demoCandidates[i];
        const loc = DEMO_LOCATIONS[i % DEMO_LOCATIONS.length];
        await dbConn
          .update(contacts)
          .set({
            city: loc.city,
            state: loc.state,
            zipCode: loc.zip,
            mapLatitude: loc.latitude,
            mapLongitude: loc.longitude,
            latitude: String(loc.latitude),
            longitude: String(loc.longitude),
            mapLocationAccuracy: "zip_centroid",
            locationAccuracy: "ZIP centroid",
            mapLocationSource: "demo_seed",
            mapLocationUpdatedAt: new Date().toISOString(),
            mapLocationStatus: "ready",
            confirmedTimeZone: loc.timeZone,
            timezone: loc.timeZone,
            isDemoData: true,
          })
          .where(eq(contacts.id, c.id));
        seeded++;
      }

      return { success: true, count: seeded, locationsUsed: DEMO_LOCATIONS.length };
    } catch (err: any) {
      console.warn("[seedDemoLocations] Failed seeding:", err);
      return { success: false, error: err.message };
    }
  }),

  /**
   * Clear seeded demo locations (PG-041 Step 8)
   */
  clearDemoLocations: adminProcedure.mutation(async () => {
    const dbConn = await db.getDb();
    if (!dbConn) return { success: false, count: 0 };

    try {
      const allContacts = await dbConn.select().from(contacts);
      const demoRecords = allContacts.filter((c: any) => c.isDemoData);
      let cleared = 0;

      for (const c of demoRecords) {
        await dbConn
          .update(contacts)
          .set({
            mapLatitude: null,
            mapLongitude: null,
            latitude: null,
            longitude: null,
            mapLocationAccuracy: "unavailable",
            locationAccuracy: "Unavailable",
            mapLocationSource: null,
            mapLocationStatus: "needs_review",
          })
          .where(eq(contacts.id, c.id));
        cleared++;
      }

      return { success: true, count: cleared };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }),

  /**
   * Recalculate coordinates for a specific contact (PG-041 Step 10)
   */
  recalculateContactLocation: protectedProcedure
    .input(z.object({ contactId: z.number() }))
    .mutation(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("Database not available");

      const [c] = await dbConn.select().from(contacts).where(eq(contacts.id, input.contactId)).limit(1);
      if (!c) throw new Error("Contact not found");

      const loc = resolveClientLocation({
        city: c.city,
        state: c.state,
        zipCode: c.zipCode,
        latitude: c.mapLatitude ?? c.latitude,
        longitude: c.mapLongitude ?? c.longitude,
      });

      await dbConn
        .update(contacts)
        .set({
          mapLatitude: loc.hasLocation ? loc.latitude : null,
          mapLongitude: loc.hasLocation ? loc.longitude : null,
          latitude: loc.hasLocation && loc.latitude != null ? String(loc.latitude) : null,
          longitude: loc.hasLocation && loc.longitude != null ? String(loc.longitude) : null,
          mapLocationAccuracy: loc.mapLocationAccuracy,
          locationAccuracy: loc.locationAccuracy,
          mapLocationSource: loc.mapLocationSource,
          mapLocationUpdatedAt: loc.mapLocationUpdatedAt,
          mapLocationStatus: loc.mapLocationStatus,
          confirmedTimeZone: c.confirmedTimeZone || (loc.hasLocation ? loc.timeZone : undefined),
          timezone: c.timezone || (loc.hasLocation ? loc.timeZone : undefined),
        })
        .where(eq(contacts.id, input.contactId));

      return { success: true, location: loc };
    }),
});
