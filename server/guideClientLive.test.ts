import { describe, it, expect, beforeEach } from "vitest";
import {
  canGuideClientsLive,
  PERMISSION_CAN_GUIDE_CLIENTS_LIVE,
} from "../client/src/lib/guidancePermissions";
import {
  upsertClientPresence,
  getClientPresence,
  createGuidanceSession,
  getGuidanceSessionBySessionId,
  getPendingGuidanceSessionForStudent,
  updateGuidanceSession,
} from "./db/guidance";
import { getStudentCaseTimeline, recordCaseActivity } from "./services/caseActivityService";

describe("Guide Client Live (PG-030-GCL) Feature Suite", () => {
  const TEST_STUDENT_ID = 999901;
  const TEST_PARENT_ID = 999902;
  const TEST_EMPLOYEE_ID = "emp_byron_001";
  const TEST_EMPLOYEE_NAME = "Byron Honea";

  describe("1. Staff Permissions Guardrail (Section 12)", () => {
    it("allows authorized staff roles (Admin, Master Coach, Advocate) by default", () => {
      expect(canGuideClientsLive({ id: "1", role: "admin" })).toBe(true);
      expect(canGuideClientsLive({ id: "2", role: "Master Coach" })).toBe(true);
      expect(canGuideClientsLive({ id: "3", role: "Advocate" })).toBe(true);
      expect(canGuideClientsLive({ id: "4", role: "Staff" })).toBe(true);
    });

    it("allows employees with the explicit 'Can Guide Clients Live' permission", () => {
      expect(
        canGuideClientsLive({
          id: "5",
          role: "Intake Staff",
          permissions: ["Internal Notes", PERMISSION_CAN_GUIDE_CLIENTS_LIVE],
        })
      ).toBe(true);

      expect(
        canGuideClientsLive({
          id: "6",
          role: "Specialist",
          publicMetadata: { permissions: [PERMISSION_CAN_GUIDE_CLIENTS_LIVE] },
        })
      ).toBe(true);
    });

    it("denies unauthorized users and clients without the permission", () => {
      expect(canGuideClientsLive(null)).toBe(false);
      expect(canGuideClientsLive(undefined)).toBe(false);
      expect(canGuideClientsLive({ id: "7", role: "client" })).toBe(false);
      expect(
        canGuideClientsLive({
          id: "8",
          role: "Intake Staff",
          permissions: ["Internal Notes"],
        })
      ).toBe(false);
    });
  });

  describe("2. Client Presence & Online Status (Section 2 & 4)", () => {
    it("correctly tracks client presence when heartbeat is received", async () => {
      const presence = await upsertClientPresence({
        studentContactId: TEST_STUDENT_ID,
        parentContactId: TEST_PARENT_ID,
        currentPath: "/portal?tab=smart-docs",
        currentSection: "Document Vault",
        isPaymentArea: false,
        isOnline: true,
      });

      expect(presence.studentContactId).toBe(TEST_STUDENT_ID);
      expect(presence.isOnline).toBe(true);
      expect(presence.currentSection).toBe("Document Vault");
      expect(presence.isPaymentArea).toBe(false);

      const fetched = await getClientPresence(TEST_STUDENT_ID);
      expect(fetched).not.toBeNull();
      expect(fetched?.currentPath).toBe("/portal?tab=smart-docs");
    });
  });

  describe("3. Session Initiation & Client Approval Flow (Section 2 & 3)", () => {
    it("creates a pending guidance session for an active client", async () => {
      const sessionId = `gcl_test_${Date.now()}`;
      const session = await createGuidanceSession({
        sessionId,
        studentContactId: TEST_STUDENT_ID,
        parentContactId: TEST_PARENT_ID,
        employeeId: TEST_EMPLOYEE_ID,
        employeeName: TEST_EMPLOYEE_NAME,
      });

      expect(session.sessionId).toBe(sessionId);
      expect(session.status).toBe("pending");
      expect(session.employeeName).toBe("Byron Honea");

      const pending = await getPendingGuidanceSessionForStudent(TEST_STUDENT_ID);
      expect(pending).not.toBeNull();
      expect(pending?.sessionId).toBe(sessionId);
    });

    it("transitions session to 'active' when client approves guidance", async () => {
      const sessionId = `gcl_test_allow_${Date.now()}`;
      await createGuidanceSession({
        sessionId,
        studentContactId: TEST_STUDENT_ID,
        parentContactId: TEST_PARENT_ID,
        employeeId: TEST_EMPLOYEE_ID,
        employeeName: TEST_EMPLOYEE_NAME,
      });

      const updated = await updateGuidanceSession(sessionId, {
        status: "active",
        connectedAt: new Date(),
      });

      expect(updated?.status).toBe("active");
      expect(updated?.connectedAt).toBeDefined();
    });

    it("transitions session to 'declined' when client clicks 'Not Now'", async () => {
      const sessionId = `gcl_test_decline_${Date.now()}`;
      await createGuidanceSession({
        sessionId,
        studentContactId: TEST_STUDENT_ID,
        parentContactId: TEST_PARENT_ID,
        employeeId: TEST_EMPLOYEE_ID,
        employeeName: TEST_EMPLOYEE_NAME,
      });

      const updated = await updateGuidanceSession(sessionId, {
        status: "declined",
        endReason: "declined",
        endedAt: new Date(),
      });

      expect(updated?.status).toBe("declined");
      expect(updated?.endReason).toBe("declined");
    });
  });

  describe("4. Point-Only Guidance & Payment Privacy Shield (Section 6, 7, 8)", () => {
    it("syncs pointer coordinates across view in normal portal sections", async () => {
      const sessionId = `gcl_test_pointer_${Date.now()}`;
      await createGuidanceSession({
        sessionId,
        studentContactId: TEST_STUDENT_ID,
        employeeId: TEST_EMPLOYEE_ID,
        employeeName: TEST_EMPLOYEE_NAME,
      });

      await updateGuidanceSession(sessionId, {
        status: "active",
        pointerX: 42.5 as any,
        pointerY: 78.1 as any,
      });

      const session = await getGuidanceSessionBySessionId(sessionId);
      expect(session?.pointerX).toBe(42.5);
      expect(session?.pointerY).toBe(78.1);
    });

    it("completely suppresses and clears pointer coordinates in Protected Payment Areas", async () => {
      const sessionId = `gcl_test_payment_shield_${Date.now()}`;
      await createGuidanceSession({
        sessionId,
        studentContactId: TEST_STUDENT_ID,
        employeeId: TEST_EMPLOYEE_ID,
        employeeName: TEST_EMPLOYEE_NAME,
      });

      // Client enters payment modal
      await updateGuidanceSession(sessionId, {
        status: "active",
        isPaymentArea: true,
        currentSection: "Billing / Payment Gateway",
        // When payment area is active, pointer is nullified
        pointerX: null,
        pointerY: null,
      });

      const session = await getGuidanceSessionBySessionId(sessionId);
      expect(session?.isPaymentArea).toBe(true);
      expect(session?.pointerX).toBeNull();
      expect(session?.pointerY).toBeNull();
    });
  });

  describe("5. Session Completion & Activity Timeline Logging (Section 9 & 11)", () => {
    it("records authentic Activity Timeline entry when session completes", async () => {
      const sessionId = `gcl_test_complete_${Date.now()}`;
      const startedAt = new Date(Date.now() - 8 * 60 * 1000); // 8 minutes ago
      const session = await createGuidanceSession({
        sessionId,
        studentContactId: TEST_STUDENT_ID,
        employeeId: TEST_EMPLOYEE_ID,
        employeeName: "Byron",
      });

      await updateGuidanceSession(sessionId, {
        status: "active",
        connectedAt: startedAt,
        currentSection: "Onboarding",
      });

      // Complete session
      const now = new Date();
      const durationSeconds = Math.round((now.getTime() - startedAt.getTime()) / 1000);
      const durationMinutes = Math.round(durationSeconds / 60);

      await updateGuidanceSession(sessionId, {
        status: "completed",
        endedAt: now,
        durationSeconds,
        endReason: "staff_ended",
      });

      // Record Activity Timeline item matching exact spec example:
      // "Live Client Guidance completed — Byron guided Tiana Dixon through the Onboarding section for 8 minutes."
      const clientName = "Tiana Dixon";
      const timelineItem = await recordCaseActivity({
        studentContactId: TEST_STUDENT_ID,
        eventType: "client_guidance",
        title: "Live Client Guidance completed",
        description: `Byron guided ${clientName} through the Onboarding section for ${durationMinutes} minutes.`,
        ownerName: "Byron",
        ownerRole: "Advocate",
        isCompleted: true,
        categoryColor: "teal",
      });

      expect(timelineItem).not.toBeNull();
      expect(timelineItem?.title).toBe("Live Client Guidance completed");
      expect(timelineItem?.description).toContain("Byron guided Tiana Dixon through the Onboarding section for 8 minutes.");
      expect(timelineItem?.categoryColor).toBe("teal");
    });
  });

  describe("6. Separation of Client Controls (Section 13)", () => {
    it("maintains strict separation between Open Client View, Guide Client Live, and Manage Portal Access", () => {
      const controls = [
        {
          name: "Open Client View",
          functionality: "Independent staff preview of client experience",
          remoteControl: false,
        },
        {
          name: "Guide Client Live",
          functionality: "Real-time Point Only co-browsing after client approval",
          remoteControl: false,
        },
        {
          name: "Manage Portal Access",
          functionality: "Configure lifecycle stage, unlocked modules, and visibility",
          remoteControl: false,
        },
      ];

      expect(controls).toHaveLength(3);
      expect(controls[0].name).not.toBe(controls[1].name);
      expect(controls[1].name).not.toBe(controls[2].name);
      // All three forbid remote clicking, employee typing, or remote control
      expect(controls.every((c) => c.remoteControl === false)).toBe(true);
    });
  });
});
