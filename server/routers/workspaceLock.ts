import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, staffProcedure } from "../_core/trpc";
import {
  getOrCreateEmployeeWorkspaceRecord,
  getPermittedShortcutsForStaff,
  updateEmployeeShortcuts,
  setupEmployeePin,
  lockEmployeeWorkspace,
  verifyAndUnlockEmployeeWorkspace,
  resetEmployeePinWithReauth,
  updateIdleTimeoutPolicy,
  getOrganizationIdleTimeoutMinutes,
  SUPPORTED_IDLE_TIMEOUT_MINUTES,
  MAX_SHORTCUTS,
  type IdleTimeoutMinutes,
} from "../db/workspaceLock";

export const workspaceLockRouter = router({
  getState: staffProcedure.query(async ({ ctx }) => {
    const record = await getOrCreateEmployeeWorkspaceRecord(
      ctx.user,
      ctx.staffAccess
    );
    const availableShortcuts = getPermittedShortcutsForStaff(ctx.staffAccess);
    const selectedShortcuts = record.shortcutIds
      .map((id) => availableShortcuts.find((s) => s.id === id))
      .filter((s): s is NonNullable<typeof s> => Boolean(s));

    return {
      employeeKey: record.employeeKey,
      hasPinSet: Boolean(record.pinSalt && record.pinHash),
      isLocked: record.isLocked,
      previousPath:
        record.previousPath && record.previousPath !== "/dashboard"
          ? record.previousPath
          : "/",
      shortcutIds: selectedShortcuts.map((s) => s.id),
      selectedShortcuts,
      availableShortcuts,
      maxShortcuts: MAX_SHORTCUTS,
      failedAttempts: record.failedAttempts,
      lockedUntilMs: record.lockedUntilMs,
      requiresReauth: record.requiresReauth,
      idleTimeoutMinutes: record.idleTimeoutMinutes,
      organizationDefaultIdleMinutes: getOrganizationIdleTimeoutMinutes(),
      supportedIdleTimeouts: SUPPORTED_IDLE_TIMEOUT_MINUTES,
      canConfigureOrgIdleTimeout: Boolean(
        ctx.staffAccess.hasAdminAccess || ctx.staffAccess.isProtectedOwner
      ),
    };
  }),

  updateShortcuts: staffProcedure
    .input(
      z.object({
        shortcutIds: z.array(z.string().min(1)).max(MAX_SHORTCUTS),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const updated = await updateEmployeeShortcuts(
          ctx.user,
          input.shortcutIds,
          ctx.staffAccess
        );
        const availableShortcuts = getPermittedShortcutsForStaff(ctx.staffAccess);
        const selectedShortcuts = updated.shortcutIds
          .map((id) => availableShortcuts.find((s) => s.id === id))
          .filter((s): s is NonNullable<typeof s> => Boolean(s));

        return {
          shortcutIds: selectedShortcuts.map((s) => s.id),
          selectedShortcuts,
        };
      } catch (err: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err?.message || "Failed to update Start Screen shortcuts.",
        });
      }
    }),

  setupPin: staffProcedure
    .input(
      z.object({
        pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits."),
        confirmPin: z.string().regex(/^\d{4}$/, "Confirmation PIN must be 4 digits."),
        currentPin: z.string().optional(),
        lockImmediately: z.boolean().optional(),
        previousPath: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        let record = await setupEmployeePin(
          ctx.user,
          input.pin,
          input.confirmPin,
          input.currentPin,
          ctx.staffAccess
        );
        if (input.lockImmediately) {
          record = await lockEmployeeWorkspace(
            ctx.user,
            input.previousPath,
            ctx.staffAccess
          );
        }
        return {
          success: true,
          hasPinSet: true,
          isLocked: record.isLocked,
          previousPath: record.previousPath,
        };
      } catch (err: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err?.message || "Failed to set workspace PIN.",
        });
      }
    }),

  lock: staffProcedure
    .input(
      z
        .object({
          previousPath: z.string().optional(),
        })
        .optional()
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const record = await lockEmployeeWorkspace(
          ctx.user,
          input?.previousPath,
          ctx.staffAccess
        );
        return {
          isLocked: record.isLocked,
          previousPath: record.previousPath,
        };
      } catch (err: any) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: err?.message || "Unable to lock workspace.",
        });
      }
    }),

  unlockWithPin: staffProcedure
    .input(
      z.object({
        pin: z.string(),
        targetDestinationPath: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await verifyAndUnlockEmployeeWorkspace(
        ctx.user,
        input.pin,
        input.targetDestinationPath,
        ctx.staffAccess
      );
      return result;
    }),

  resetPinWithReauth: staffProcedure
    .input(
      z.object({
        confirmedEmail: z.string().email("Enter your account email address."),
        newPin: z.string().regex(/^\d{4}$/, "New PIN must be 4 digits."),
        confirmNewPin: z.string().regex(/^\d{4}$/, "Confirmation PIN must be 4 digits."),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const record = await resetEmployeePinWithReauth(
          ctx.user,
          input.confirmedEmail,
          input.newPin,
          input.confirmNewPin,
          ctx.staffAccess
        );
        return {
          success: true,
          isLocked: record.isLocked,
          previousPath: record.previousPath,
        };
      } catch (err: any) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: err?.message || "Account reauthentication failed.",
        });
      }
    }),

  updateIdleTimeout: staffProcedure
    .input(
      z.object({
        minutes: z.union([
          z.literal(2),
          z.literal(5),
          z.literal(10),
          z.literal(15),
        ]),
        applyOrganizationWide: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateIdleTimeoutPolicy(
          input.minutes as IdleTimeoutMinutes,
          ctx.user,
          input.applyOrganizationWide,
          ctx.staffAccess
        );
      } catch (err: any) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: err?.message || "Failed to update inactivity lock timeout.",
        });
      }
    }),

  savePreviousPath: staffProcedure
    .input(z.object({ path: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const record = await getOrCreateEmployeeWorkspaceRecord(
        ctx.user,
        ctx.staffAccess
      );
      if (
        !record.isLocked &&
        input.path.startsWith("/") &&
        !input.path.startsWith("/start")
      ) {
        record.previousPath = input.path;
      }
      return { previousPath: record.previousPath };
    }),
});

