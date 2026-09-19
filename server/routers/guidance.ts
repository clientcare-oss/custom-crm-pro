import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getClientPresence,
  upsertClientPresence,
  createGuidanceSession,
  getGuidanceSessionBySessionId,
  getPendingGuidanceSessionForStudent,
  updateGuidanceSession,
  getContactById,
} from "../db";
import { recordCaseActivity } from "../services/caseActivityService";

export const guidanceRouter = router({
  /**
   * 1. Check whether client is currently signed in and active in portal.
   */
  checkPresence: protectedProcedure
    .input(
      z.object({
        studentContactId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const presence = await getClientPresence(input.studentContactId);
      if (!presence) {
        return { isOnline: false };
      }

      const diffMs = Date.now() - new Date(presence.lastSeenAt).getTime();
      // Consider online if client sent a heartbeat in the last 45 seconds
      const isOnline = Boolean(presence.isOnline) && diffMs <= 45000;

      return {
        isOnline,
        lastSeenAt: presence.lastSeenAt,
        currentSection: presence.currentSection,
        currentPath: presence.currentPath,
      };
    }),

  /**
   * 2. Initiate a new staff-guided co-browsing session.
   * Authorized staff initiates request; checks online presence first.
   */
  initiate: protectedProcedure
    .input(
      z.object({
        studentContactId: z.number(),
        parentContactId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Permission check: staff must be authorized
      const user = ctx.user;
      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Staff authentication required." });
      }

      // Check online presence
      const presence = await getClientPresence(input.studentContactId);
      const isOnline =
        presence &&
        Boolean(presence.isOnline) &&
        Date.now() - new Date(presence.lastSeenAt).getTime() <= 45000;

      if (!isOnline) {
        return {
          success: false,
          error: "CLIENT_OFFLINE" as const,
          message: "Client is not currently signed into the portal.",
        };
      }

      const sessionId = `gcl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const employeeName = user.name || "Waypoint Staff";

      const session = await createGuidanceSession({
        sessionId,
        studentContactId: input.studentContactId,
        parentContactId: input.parentContactId,
        employeeId: String(user.id),
        employeeName,
      });

      return {
        success: true,
        sessionId: session.sessionId,
        status: session.status,
      };
    }),

  /**
   * 3. Staff polls session state (approval status, live navigation section, pointer sync).
   */
  pollStaffSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const session = await getGuidanceSessionBySessionId(input.sessionId);
      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Guidance session not found." });
      }

      // Calculate elapsed duration if active
      let durationSeconds = session.durationSeconds;
      if (session.status === "active" && session.connectedAt) {
        durationSeconds = Math.max(0, Math.round((Date.now() - new Date(session.connectedAt).getTime()) / 1000));
      }

      return {
        sessionId: session.sessionId,
        status: session.status,
        currentSection: session.currentSection,
        currentPath: session.currentPath,
        currentTab: session.currentTab,
        isPaymentArea: Boolean(session.isPaymentArea),
        pointerX: session.pointerX,
        pointerY: session.pointerY,
        highlightSelector: session.highlightSelector,
        startedAt: session.startedAt,
        connectedAt: session.connectedAt,
        endedAt: session.endedAt,
        durationSeconds,
        endReason: session.endReason,
      };
    }),

  /**
   * 4. Client polls for incoming guidance invitations.
   */
  clientGetPending: publicProcedure
    .input(
      z.object({
        studentContactId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const session = await getPendingGuidanceSessionForStudent(input.studentContactId);
      if (!session) {
        return { hasRequest: false };
      }

      return {
        hasRequest: true,
        sessionId: session.sessionId,
        employeeName: session.employeeName,
      };
    }),

  /**
   * 5. Client responds to guidance invitation (Allow or Not Now).
   */
  clientRespond: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        allow: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const session = await getGuidanceSessionBySessionId(input.sessionId);
      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." });
      }

      const now = new Date();
      if (input.allow) {
        await updateGuidanceSession(input.sessionId, {
          status: "active",
          connectedAt: now,
        });

        return { success: true, status: "active" as const };
      } else {
        await updateGuidanceSession(input.sessionId, {
          status: "declined",
          endedAt: now,
          endReason: "declined",
        });

        // Record declined action in Activity Timeline
        try {
          const student = await getContactById(session.studentContactId);
          const studentName = student
            ? `${student.firstName || ""} ${student.lastName || ""}`.trim()
            : "Client";

          await recordCaseActivity({
            studentContactId: session.studentContactId,
            caseId: student?.caseId,
            eventType: "client_guidance",
            title: "Live Client Guidance declined",
            description: `The client did not approve the guidance session with ${session.employeeName}.`,
            ownerName: session.employeeName,
            ownerRole: "Advocate",
            isCompleted: true,
            categoryColor: "amber",
            eventDate: now.toISOString(),
          });
        } catch (err) {
          // Log suppression
        }

        return { success: true, status: "declined" as const };
      }
    }),

  /**
   * 6. Client heartbeat and live navigation sync.
   * Client sends current route/tab and whether payment area is open.
   * Zero sensitive card/bank data is EVER accepted or transmitted!
   */
  clientHeartbeat: publicProcedure
    .input(
      z.object({
        studentContactId: z.number(),
        parentContactId: z.number().optional(),
        currentPath: z.string().optional(),
        currentSection: z.string().optional(),
        isPaymentArea: z.boolean().optional(),
        sessionId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // 1. Update presence
      await upsertClientPresence({
        studentContactId: input.studentContactId,
        parentContactId: input.parentContactId,
        currentPath: input.currentPath,
        currentSection: input.currentSection,
        isPaymentArea: input.isPaymentArea,
        isOnline: true,
      });

      // 2. If session active, sync session navigation
      if (input.sessionId) {
        const session = await getGuidanceSessionBySessionId(input.sessionId);
        if (session) {
          if (session.status === "active" || session.status === "approved") {
            await updateGuidanceSession(input.sessionId, {
              status: "active",
              currentPath: input.currentPath || session.currentPath,
              currentSection: input.currentSection || session.currentSection,
              isPaymentArea: Boolean(input.isPaymentArea),
            });

            return {
              active: true,
              pointerX: session.isPaymentArea ? null : session.pointerX,
              pointerY: session.isPaymentArea ? null : session.pointerY,
              highlightSelector: session.isPaymentArea ? null : session.highlightSelector,
              status: session.status,
            };
          } else {
            return {
              active: false,
              shouldEnd: true,
              status: session.status,
            };
          }
        }
      }

      return { active: false };
    }),

  /**
   * 7. Staff sends point-only guidance coordinates.
   * If payment area is active, pointer is suppressed completely.
   */
  staffSyncPointer: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        pointerX: z.number().min(0).max(100).nullable(),
        pointerY: z.number().min(0).max(100).nullable(),
        highlightSelector: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const session = await getGuidanceSessionBySessionId(input.sessionId);
      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." });
      }

      // If client is currently in protected payment area, staff pointer is disabled
      if (session.isPaymentArea) {
        await updateGuidanceSession(input.sessionId, {
          pointerX: null,
          pointerY: null,
          highlightSelector: null,
        });
        return { success: true, pointerSuppressed: true };
      }

      await updateGuidanceSession(input.sessionId, {
        pointerX: input.pointerX as any,
        pointerY: input.pointerY as any,
        highlightSelector: input.highlightSelector || null,
      });

      return { success: true, pointerSuppressed: false };
    }),

  /**
   * 8. Either staff or client ends the guidance session.
   * Computes duration and writes entry to Activity Timeline.
   */
  endSession: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        reason: z
          .enum(["completed", "staff_ended", "client_ended", "disconnected", "expired", "declined"])
          .default("completed"),
      })
    )
    .mutation(async ({ input }) => {
      const session = await getGuidanceSessionBySessionId(input.sessionId);
      if (!session) {
        return { success: true };
      }

      if (session.status === "completed" || session.status === "disconnected") {
        return { success: true, durationSeconds: session.durationSeconds };
      }

      const now = new Date();
      const startTime = session.connectedAt || session.startedAt;
      const durationSeconds = Math.max(1, Math.round((now.getTime() - new Date(startTime).getTime()) / 1000));
      const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

      const newStatus = input.reason === "disconnected" ? "disconnected" : "completed";

      await updateGuidanceSession(input.sessionId, {
        status: newStatus,
        endedAt: now,
        durationSeconds,
        endReason: input.reason,
      });

      // Write Activity Timeline entry (Item 11 in spec)
      try {
        const student = await getContactById(session.studentContactId);
        const studentName = student
          ? `${student.firstName || ""} ${student.lastName || ""}`.trim()
          : "Student";
        const parentName = student?.parentName;
        const targetName = parentName ? `${parentName} (${studentName})` : studentName;
        const sectionName = session.currentSection || "Overview";

        await recordCaseActivity({
          studentContactId: session.studentContactId,
          caseId: student?.caseId,
          eventType: "client_guidance",
          title: "Live Client Guidance completed",
          description: `${session.employeeName} guided ${targetName} through the ${sectionName} section for ${durationMinutes} minutes.`,
          ownerName: session.employeeName,
          ownerRole: "Advocate",
          isCompleted: true,
          categoryColor: "teal",
          eventDate: now.toISOString(),
        });
      } catch (err) {
        // Safe failover
      }

      return {
        success: true,
        durationSeconds,
        durationMinutes,
      };
    }),
});
