import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { brainDumpItems, brainDumpImages } from "../../drizzle/schema";

export const appointmentsRouter = router({

    list: adminProcedure.query(async ({ ctx }) => {
      return await db.getAppointmentsByOwner(ctx.user.id);
    }),

    // Public booking endpoint - no auth required
    book: publicProcedure
      .input(
        z.object({
          title: z.string().min(1),
          clientId: z.number().optional(),
          description: z.string().optional(),
          startTime: z.date(),
          endTime: z.date(),
          sessionTypeId: z.number().optional(), // used to recompute endTime server-side
          location: z.string().optional(),
          meetingType: z.string().optional(),
          parentName: z.string().optional(),
          studentName: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { users: usersTable, sessionTypes: sessionTypesTable } = await import("../../drizzle/schema");
        const dbConn2 = await db.getDb();
        let owner = await db.getUserByOpenId(ENV.ownerOpenId);
        if (!owner && dbConn2) {
          const [firstAdmin] = await dbConn2.select().from(usersTable).where(eq(usersTable.role, 'admin')).limit(1);
          owner = firstAdmin ?? null;
        }
        if (!owner) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Owner not found" });

        // Recompute endTime server-side from session type to prevent client-side duration bugs
        let computedEndTime = input.endTime;
        if (input.sessionTypeId && dbConn2) {
          const [st] = await dbConn2.select().from(sessionTypesTable).where(eq(sessionTypesTable.id, input.sessionTypeId)).limit(1);
          if (st) {
            const durationMin = String(st.durationUnit).trim() === 'hours' ? Number(st.duration) * 60 : Number(st.duration);
            computedEndTime = new Date(input.startTime.getTime() + durationMin * 60 * 1000);
            console.log('[book] sessionType:', st.name, 'duration:', st.duration, st.durationUnit, '-> durationMin:', durationMin, 'endTime:', computedEndTime);
          }
        } else {
          console.log('[book] no sessionTypeId, using client endTime, diff_min:', (input.endTime.getTime() - input.startTime.getTime()) / 60000);
        }

        // Auto-fill parentPhone from the linked contact (student's parent)
        let resolvedParentPhone: string | undefined = undefined;
        if (input.clientId && dbConn2) {
          try {
            const { contacts: contactsTable } = await import("../../drizzle/schema");
            const [student] = await dbConn2.select().from(contactsTable).where(eq(contactsTable.id, input.clientId)).limit(1);
            if (student) {
              // If student has a parentContactId, get the parent's phone
              if ((student as any).parentContactId) {
                const [parent] = await dbConn2.select().from(contactsTable).where(eq(contactsTable.id, (student as any).parentContactId)).limit(1);
                if (parent?.phone) resolvedParentPhone = parent.phone;
              } else if (student.phone) {
                // No parent link — use the contact's own phone
                resolvedParentPhone = student.phone;
              }
            }
          } catch { /* ignore */ }
        }
        const appointment = await db.createAppointment({
          ...input,
          endTime: computedEndTime,
          status: "Scheduled",
          parentPhone: resolvedParentPhone ?? input.parentName ? resolvedParentPhone : undefined,
        }, owner.id);
        // Notify owner of new booking
        try {
          await notifyOwner({
            title: "New Appointment Booking",
            content: `${input.title} scheduled for ${new Date(input.startTime).toLocaleString()}`,
          });
        } catch (e) {
          console.error("[Notification] Failed to notify owner of booking:", e);
        }
        return appointment;
      }),

    get: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getAppointmentsByOwner(ctx.user.id);
      }),

    create: adminProcedure
      .input(
        z.object({
          clientId: z.number().optional(),
          caseId: z.string().optional(),
          title: z.string().min(1),
          description: z.string().optional(),
          startTime: z.date(),
          endTime: z.date(),
          location: z.string().optional(),
          videoLink: z.string().optional(),
          meetingType: z.string().optional(),
          parentName: z.string().optional(),
          parentPhone: z.string().optional(),
          studentName: z.string().optional(),
          status: z.enum(["Scheduled", "Confirmed", "Completed", "Cancelled"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await db.createAppointment(input, ctx.user.id);
      }),
    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          caseId: z.string().optional(),
          title: z.string().optional(),
          description: z.string().optional(),
          startTime: z.date().optional(),
          endTime: z.date().optional(),
          location: z.string().optional(),
          videoLink: z.string().optional(),
          meetingType: z.string().optional(),
          parentName: z.string().optional(),
          parentPhone: z.string().optional(),
          studentName: z.string().optional(),
          status: z.enum(["Scheduled", "Confirmed", "Completed", "Cancelled"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return await db.updateAppointment(id, ctx.user.id, data);
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return await db.deleteAppointment(input.id, ctx.user.id);
      }),

    cancelWithNotify: adminProcedure
      .input(z.object({
        id: z.number(),
        notifyParent: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        // Mark appointment as Cancelled
        await db.updateAppointment(input.id, ctx.user.id, { status: "Cancelled" });

        if (input.notifyParent) {
          // Fetch the appointment to get parent email / name / time
          const apts = await db.getAppointmentsByOwner(ctx.user.id);
          const apt = (apts as any[]).find((a: any) => a.id === input.id);
          if (apt) {
            // Try to find parent email from contacts
            let parentEmail: string | null = null;
            if (apt.clientId) {
              try {
                const contact = await db.getContactById(apt.clientId, ctx.user.id);
                if (contact) parentEmail = (contact as any).email ?? null;
              } catch { /* ignore */ }
            }
            if (parentEmail) {
              const { sendEmail } = await import("../_core/email");
              const dateStr = new Date(apt.startTime).toLocaleString("en-US", {
                weekday: "long", month: "long", day: "numeric", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              });
              await sendEmail({
                to: parentEmail,
                subject: `Appointment Cancelled: ${apt.title}`,
                html: `
                  <p>Hello${apt.parentName ? ` ${apt.parentName}` : ""},</p>
                  <p>We wanted to let you know that the following appointment has been <strong>cancelled</strong>:</p>
                  <ul>
                    <li><strong>Meeting:</strong> ${apt.title}</li>
                    <li><strong>Date &amp; Time:</strong> ${dateStr}</li>
                    ${apt.studentName ? `<li><strong>Student:</strong> ${apt.studentName}</li>` : ""}
                  </ul>
                  <p>Please reach out if you have any questions or would like to reschedule.</p>
                  <p>Thank you,<br/>Waypoint Advocacy</p>
                `,
              });
            }
          }
        }

        return { success: true };
      }),

    // Public: get available time slots for a session type on a given date
    getAvailableSlots: publicProcedure
      .input(z.object({
        sessionTypeId: z.number(),
        date: z.string(), // YYYY-MM-DD
      }))
      .query(async ({ input }) => {
        const { sessionTypes } = await import("../../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const rows = await dbConn.select().from(sessionTypes).where(eq(sessionTypes.id, input.sessionTypeId)).limit(1);
        const st = rows[0];
        if (!st) throw new TRPCError({ code: "NOT_FOUND", message: "Session type not found" });
        // Parse weekly hours
        const weeklyHours: Record<string, { start: string; end: string }[]> = st.weeklyHours ? JSON.parse(st.weeklyHours) : {};
        const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
        const dateObj = new Date(input.date + "T00:00:00");
        const dayKey = dayNames[dateObj.getDay()];
        const daySlots = weeklyHours[dayKey] || [];
        if (daySlots.length === 0) return [];
        // Generate slots based on duration and increment
        const durationMin = st.durationUnit === "hours" ? st.duration * 60 : st.duration;
        const increment = st.customIncrements || durationMin;
        const slots: string[] = [];
        for (const range of daySlots) {
          const [startH, startM] = range.start.split(":").map(Number);
          const [endH, endM] = range.end.split(":").map(Number);
          let current = startH * 60 + startM;
          const end = endH * 60 + endM;
          while (current + durationMin <= end) {
            const h = Math.floor(current / 60);
            const m = current % 60;
            slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
            current += increment;
          }
        }
        // ── Double-booking prevention ──────────────────────────────────────
        // The slots are generated as local "wall clock" times (e.g. "09:00").
        // Appointments are stored as UTC datetime values in the DB.
        // Strategy: convert each slot to an absolute UTC timestamp for the
        // requested date, then do a proper timestamp-based overlap check.
        // We treat the slot times as America/New_York (Eastern) because that
        // is the business timezone.  The UTC offset is determined at runtime
        // so it handles EST (-5) vs EDT (-4) automatically.
        const { appointments } = await import("../../drizzle/schema");
        const { gte: aGte, lte: aLte, sql: aSql } = await import("drizzle-orm");

        // Helper: convert a "HH:MM" wall-clock time on input.date to a UTC ms timestamp.
        // We use the Intl API to find the UTC offset for America/New_York on that date.
        function localToUtcMs(dateStr: string, timeStr: string, tz = "America/New_York"): number {
          const [h, m] = timeStr.split(":").map(Number);
          // Use noon UTC as reference — noon UTC always falls on the same calendar day
          // in Eastern time (UTC-4 to UTC-5), avoiding the midnight off-by-one-day bug.
          const noonUtc = Date.UTC(
            Number(dateStr.slice(0,4)),
            Number(dateStr.slice(5,7)) - 1,
            Number(dateStr.slice(8,10)),
            12, 0, 0
          );
          const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", second: "2-digit",
            hour12: false,
          });
          const parts = formatter.formatToParts(new Date(noonUtc));
          const p: Record<string,string> = {};
          parts.forEach(x => { p[x.type] = x.value; });
          // tzNoonMs = the UTC timestamp that corresponds to noon in this tz
          const tzNoonMs = Date.UTC(
            Number(p.year), Number(p.month)-1, Number(p.day),
            Number(p.hour === '24' ? '0' : p.hour), Number(p.minute), Number(p.second)
          );
          const offsetMs = noonUtc - tzNoonMs; // positive = tz is behind UTC
          const utcMidnight = Date.UTC(
            Number(dateStr.slice(0,4)),
            Number(dateStr.slice(5,7)) - 1,
            Number(dateStr.slice(8,10))
          );
          return utcMidnight + h * 3600000 + m * 60000 + offsetMs;
        }

        // Fetch ALL appointments that could overlap this day (±1 day buffer for timezone edge cases)
        const bufferDayStart = new Date(input.date + "T00:00:00Z");
        bufferDayStart.setUTCDate(bufferDayStart.getUTCDate() - 1);
        const bufferDayEnd = new Date(input.date + "T23:59:59Z");
        bufferDayEnd.setUTCDate(bufferDayEnd.getUTCDate() + 1);

        const booked = await dbConn
          .select({ startTime: appointments.startTime, endTime: appointments.endTime })
          .from(appointments)
          .where(
            and(
              aGte(appointments.startTime, bufferDayStart),
              aLte(appointments.startTime, bufferDayEnd),
              aSql`${appointments.status} NOT IN ('Cancelled', 'No-Show')`
            )
          );

        console.log(`[scheduler] date=${input.date} booked appointments:`, booked.map(b => ({ start: b.startTime, end: b.endTime })));

        const availableSlots = slots.filter((slot) => {
          const slotStartMs = localToUtcMs(input.date, slot);
          const slotEndMs   = slotStartMs + durationMin * 60000;
          const blocked = booked.some((appt) => {
            const apptStartMs = new Date(appt.startTime).getTime();
            let apptEndMs: number;
            const apptEndDate = new Date(appt.endTime);
            if (apptEndDate.getTime() > apptStartMs) {
              apptEndMs = apptEndDate.getTime();
            } else {
              apptEndMs = apptStartMs + durationMin * 60000;
            }
            // Overlap: slot starts before appt ends AND slot ends after appt starts
            return slotStartMs < apptEndMs && slotEndMs > apptStartMs;
          });
          return !blocked;
        });
        console.log(`[scheduler] date=${input.date} slots generated=${slots.length} available=${availableSlots.length}`);
        return availableSlots;
      }),
  
});
