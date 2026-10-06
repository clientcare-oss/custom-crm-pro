import { z } from "zod";
import { router, protectedProcedure, publicProcedure, portalProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";

export const proposedMeetingsRouter = router({
  // 1. List proposed meetings with linked candidate slots
  list: protectedProcedure
    .input(
      z
        .object({
          clientId: z.number().optional(),
          status: z.string().optional(),
          includeCompleted: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return await db.listProposedMeetings({
        ownerId: ctx.user.role === "admin" ? undefined : ctx.user.id,
        clientId: input?.clientId,
        status: input?.status,
        includeCompleted: input?.includeCompleted,
      });
    }),

  // 2. Get a single proposed meeting by ID with all sibling candidate slots
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const meeting = await db.getProposedMeetingById(input.id);
      if (!meeting) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proposed meeting not found" });
      }
      return meeting;
    }),

  // 3. Create a Proposed Meeting with candidate time slots
  create: protectedProcedure
    .input(
      z.object({
        studentName: z.string().min(1, "Student name is required"),
        clientId: z.number().optional(),
        parentContactId: z.number().optional(),
        leadId: z.number().optional(),
        caseId: z.string().optional(),
        parentName: z.string().optional(),
        parentEmail: z.string().optional(),
        parentPhone: z.string().optional(),
        meetingType: z.string().optional().default("Meeting Type Not Yet Determined"),
        schoolDistrict: z.string().optional(),
        location: z.string().optional(),
        virtualMeetingLink: z.string().optional(),
        notes: z.string().optional(),
        internalNotes: z.string().optional(),
        clientTimeZone: z.string().optional(),
        assignedAdvocateName: z.string().optional(),
        waitingOn: z.enum(["Parent / Client", "School", "Waypoint", "Multiple Parties", "Other"]).default("School"),
        waitingOnOtherExplanation: z.string().optional(),
        finalDateProcess: z.enum(["WAYPOINT_CONFIRMS", "PARENT_CAN_CONFIRM", "PARENT_PREFERENCE_THEN_WAYPOINT"]).default("WAYPOINT_CONFIRMS"),
        followUpBy: z.string().optional(), // YYYY-MM-DD
        candidateSlots: z.array(
          z.object({
            startTime: z.union([z.date(), z.string()]),
            endTime: z.union([z.date(), z.string()]),
            durationMinutes: z.number().optional(),
            notes: z.string().optional(),
          })
        ).min(1, "At least one candidate date/time slot is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Resolve client timezone if not provided
      let resolvedTz = input.clientTimeZone;
      if (!resolvedTz && input.clientId) {
        try {
          const contact = await db.getContactById(input.clientId, ctx.user.id);
          if (contact) {
            resolvedTz = (contact as any).confirmedTimeZone || (contact as any).timezone;
          }
        } catch {}
      }

      return await db.createProposedMeeting({
        ...input,
        ownerId: ctx.user.id,
        assignedAdvocateName: input.assignedAdvocateName || ctx.user.name || "Byron Honea",
        clientTimeZone: resolvedTz || "America/New_York",
      });
    }),

  // 4. Add another candidate slot to an existing Proposed Meeting
  addCandidateSlot: protectedProcedure
    .input(
      z.object({
        proposedMeetingId: z.number(),
        slot: z.object({
          startTime: z.union([z.date(), z.string()]),
          endTime: z.union([z.date(), z.string()]),
          durationMinutes: z.number().optional(),
          notes: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      return await db.addCandidateSlotToMeeting(input.proposedMeetingId, input.slot);
    }),

  // 5. Update a candidate slot time or notes
  updateCandidateSlot: protectedProcedure
    .input(
      z.object({
        slotId: z.number(),
        startTime: z.union([z.date(), z.string()]).optional(),
        endTime: z.union([z.date(), z.string()]).optional(),
        durationMinutes: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { slotId, ...updates } = input;
      return await db.updateCandidateSlot(slotId, updates);
    }),

  // 6. Release a single candidate slot
  releaseCandidateSlot: protectedProcedure
    .input(
      z.object({
        slotId: z.number(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.releaseCandidateSlot(input.slotId, input.reason);
    }),

  // 7. Release all holds for a Proposed Meeting
  releaseAllHolds: protectedProcedure
    .input(
      z.object({
        proposedMeetingId: z.number(),
        reason: z.string().min(1, "Release reason is required"),
        newStatus: z.enum(["AWAITING_NEW_DATES", "POSTPONED", "CANCELED", "CLOSED"]).default("AWAITING_NEW_DATES"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const staffName = ctx.user.name || "Waypoint Staff";
      return await db.releaseAllHoldsForMeeting(
        input.proposedMeetingId,
        input.reason,
        input.newStatus,
        staffName
      );
    }),

  // 8. Parent selects preference ("THIS DATE WORKS FOR ME")
  setPreference: protectedProcedure
    .input(
      z.object({
        proposedMeetingId: z.number(),
        candidateSlotId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await db.setParentPreference(
        input.proposedMeetingId,
        input.candidateSlotId,
        ctx.user.name || "Parent"
      );
    }),

  // 9. ATOMIC CONFIRMATION: Confirm one slot, release sibling holds, create Confirmed Appointment
  confirm: protectedProcedure
    .input(
      z.object({
        proposedMeetingId: z.number(),
        candidateSlotId: z.number(),
        extraDetails: z
          .object({
            location: z.string().optional(),
            virtualMeetingLink: z.string().optional(),
            internalNotes: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const confirmedBy = ctx.user.name || "Byron Honea";
      return await db.confirmProposedMeetingSlot(
        input.proposedMeetingId,
        input.candidateSlotId,
        confirmedBy,
        input.extraDetails
      );
    }),

  // 10. Work queue: HOLDS NEEDING ATTENTION
  getHoldsNeedingAttention: protectedProcedure.query(async ({ ctx }) => {
    return await db.getHoldsNeedingAttention(ctx.user.role === "admin" ? undefined : ctx.user.id);
  }),

  // 11. Conflict detection before scheduling
  checkConflicts: protectedProcedure
    .input(
      z.object({
        startTime: z.union([z.date(), z.string()]),
        endTime: z.union([z.date(), z.string()]),
        excludeMeetingId: z.number().optional(),
        excludeAppointmentId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return await db.detectSchedulingConflicts(input.startTime, input.endTime, {
        excludeMeetingId: input.excludeMeetingId,
        excludeAppointmentId: input.excludeAppointmentId,
      });
    }),

  // 12. Unified Calendar Events query (Confirmed Appointments + Active Held Slots)
  getUnifiedCalendarEvents: protectedProcedure
    .input(
      z
        .object({
          advocateFilter: z.string().optional(), // "all" | advocate name
          includeReleasedHolds: z.boolean().optional().default(false),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const apts = await db.getAppointmentsByOwner(ctx.user.id);
      const proposed = await db.listProposedMeetings({
        includeCompleted: input?.includeReleasedHolds,
      });

      // Filter confirmed appointments
      const confirmedEvents = (apts as any[])
        .filter((a) => a.status !== "Cancelled")
        .filter((a) => {
          if (!input?.advocateFilter || input.advocateFilter === "all") return true;
          return a.assignedAdvocateName === input.advocateFilter;
        })
        .map((a) => ({
          id: `apt-${a.id}`,
          originalId: a.id,
          type: "CONFIRMED_APPOINTMENT" as const,
          title: a.title,
          studentName: a.studentName || "Student",
          parentName: a.parentName,
          parentPhone: a.parentPhone,
          startTime: new Date(a.startTime),
          endTime: new Date(a.endTime),
          location: a.location,
          videoLink: a.videoLink || a.clientMeetingLink,
          status: a.status || "Confirmed",
          meetingType: a.meetingType || "Meeting",
          assignedAdvocateName: a.assignedAdvocateName || "Byron Honea",
          clientTimeZone: a.clientTimeZone || "America/New_York",
          proposedMeetingId: a.proposedMeetingId,
          candidateSlotId: a.candidateSlotId,
          isHold: false,
        }));

      // Map candidate slots from proposed meetings
      const holdEvents: any[] = [];
      for (const meeting of proposed) {
        if (input?.advocateFilter && input.advocateFilter !== "all" && meeting.assignedAdvocateName !== input.advocateFilter) {
          continue;
        }

        const activeSlots = meeting.candidateSlots.filter((s) => {
          if (input?.includeReleasedHolds) return true;
          return s.status === "HELD" || s.status === "PARENT_SELECTED";
        });

        const totalOptions = meeting.candidateSlots.length;

        activeSlots.forEach((slot, index) => {
          holdEvents.push({
            id: `hold-${slot.id}`,
            originalId: slot.id,
            type: "TENTATIVE_HOLD" as const,
            title: `${meeting.studentName} — ${meeting.meetingType}`,
            studentName: meeting.studentName,
            parentName: meeting.parentName,
            parentPhone: meeting.parentPhone,
            startTime: new Date(slot.startTime),
            endTime: new Date(slot.endTime),
            durationMinutes: slot.durationMinutes,
            location: meeting.location,
            videoLink: meeting.virtualMeetingLink,
            status: slot.status, // "HELD" | "PARENT_SELECTED" | "RELEASED"
            meetingStatus: meeting.status,
            meetingType: meeting.meetingType,
            assignedAdvocateName: meeting.assignedAdvocateName || "Byron Honea",
            clientTimeZone: meeting.clientTimeZone || "America/New_York",
            proposedMeetingId: meeting.id,
            candidateSlotId: slot.id,
            slotOrder: slot.slotOrder || index + 1,
            totalSiblingSlots: totalOptions,
            siblingLabel: `${slot.slotOrder || index + 1} OF ${totalOptions} POSSIBLE DATES`,
            waitingOn: meeting.waitingOn,
            finalDateProcess: meeting.finalDateProcess,
            followUpBy: meeting.followUpBy,
            parentPreferred: slot.status === "PARENT_SELECTED" || meeting.parentPreferredSlotId === slot.id,
            isHold: true,
          });
        });
      }

      return {
        confirmedEvents,
        holdEvents,
        allEvents: [...confirmedEvents, ...holdEvents].sort(
          (a, b) => a.startTime.getTime() - b.startTime.getTime()
        ),
      };
    }),
});
