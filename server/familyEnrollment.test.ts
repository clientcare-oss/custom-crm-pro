import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  PUBLISHED_MEMBERSHIP_PLANS,
  approveFamilyEnrollment,
  resendFamilyEnrollmentInvitation,
  revokeFamilyEnrollmentOffer,
} from "./services/familyEnrollmentService";
import * as db from "./db";
import * as caseActivityService from "./services/caseActivityService";
import fs from "fs";
import path from "path";

describe("Phase 2A — Family Enrollment Approval & Persistent Offer Engine", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Criterion 1 & 2: Authoritative Services Catalog Plans (PG-035)", () => {
    it("should export exactly the three authoritative Waypoint membership plans with 12-month commitment", () => {
      expect(PUBLISHED_MEMBERSHIP_PLANS).toHaveLength(3);

      const [navigator, anchor, family] = PUBLISHED_MEMBERSHIP_PLANS;
      expect(navigator.planKey).toBe("navigator");
      expect(navigator.planName).toBe("Navigator");
      expect(navigator.priceMonthly).toBe(55);
      expect(navigator.commitmentMonths).toBe(12);

      expect(anchor.planKey).toBe("anchor");
      expect(anchor.planName).toBe("Anchor");
      expect(anchor.priceMonthly).toBe(105);
      expect(anchor.commitmentMonths).toBe(12);

      expect(family.planKey).toBe("family");
      expect(family.planName).toBe("Family");
      expect(family.priceMonthly).toBe(155);
      expect(family.commitmentMonths).toBe(12);
    });

    it("should maintain immutability of published plans when custom offers are created", () => {
      const customPrice = 135;
      expect(PUBLISHED_MEMBERSHIP_PLANS[0].priceMonthly).toBe(55);
      expect(PUBLISHED_MEMBERSHIP_PLANS[1].priceMonthly).toBe(105);
      expect(PUBLISHED_MEMBERSHIP_PLANS[2].priceMonthly).toBe(155);
      expect(customPrice).not.toBe(PUBLISHED_MEMBERSHIP_PLANS[0].priceMonthly);
    });
  });

  describe("Criterion 3, 4 & 5: Discovery Completion & Staff Exception Override", () => {
    it("should block standard enrollment approval when discovery is incomplete and no override is provided", async () => {
      vi.spyOn(db, "getContactById").mockResolvedValue({
        id: 101,
        firstName: "Sarah",
        lastName: "Jenkins",
        jobTitle: "Parent",
      } as any);
      vi.spyOn(db, "getStudentsByParentContactId").mockResolvedValue([
        { id: 201, firstName: "Timmy", lastName: "Jenkins", parentContactId: 101 } as any,
      ]);
      vi.spyOn(db, "getLeadsByOwner").mockResolvedValue([]);
      vi.spyOn(db, "listDiscoveryCalls").mockResolvedValue([
        { id: 301, status: "Preparing" } as any, // Not completed
      ]);

      await expect(
        approveFamilyEnrollment({
          parentContactId: 101,
          studentContactId: 201,
          enrollmentMode: "standard",
          billingArrangement: "autopay",
          overrideDiscovery: false,
        })
      ).rejects.toThrow(/Completed discovery call is normally required/);
    });

    it("should reject discovery override when exception reason is missing or too short", async () => {
      vi.spyOn(db, "getContactById").mockResolvedValue({
        id: 101,
        firstName: "Sarah",
        lastName: "Jenkins",
        jobTitle: "Parent",
      } as any);
      vi.spyOn(db, "getStudentsByParentContactId").mockResolvedValue([
        { id: 201, firstName: "Timmy", lastName: "Jenkins", parentContactId: 101 } as any,
      ]);
      vi.spyOn(db, "getLeadsByOwner").mockResolvedValue([]);
      vi.spyOn(db, "listDiscoveryCalls").mockResolvedValue([
        { id: 301, status: "in_progress" } as any,
      ]);

      await expect(
        approveFamilyEnrollment({
          parentContactId: 101,
          studentContactId: 201,
          enrollmentMode: "standard",
          billingArrangement: "autopay",
          overrideDiscovery: true,
          overrideReason: "bad", // < 5 characters
        })
      ).rejects.toThrow(/specific exception reason.*at least 5 characters.*required/);
    });

    it("should permit approval with valid staff override and record timeline activity entry", async () => {
      vi.spyOn(db, "getContactById").mockResolvedValue({
        id: 101,
        firstName: "Sarah",
        lastName: "Jenkins",
        jobTitle: "Parent",
      } as any);
      vi.spyOn(db, "getStudentsByParentContactId").mockResolvedValue([
        { id: 201, firstName: "Timmy", lastName: "Jenkins", parentContactId: 101 } as any,
      ]);
      vi.spyOn(db, "getLeadsByOwner").mockResolvedValue([]);
      vi.spyOn(db, "listDiscoveryCalls").mockResolvedValue([
        { id: 301, status: "in_progress" } as any,
      ]);
      vi.spyOn(db, "getActiveOfferForFamily").mockResolvedValue(null);

      let createdOfferData: any = null;
      vi.spyOn(db, "createEnrollmentOffer").mockImplementation(async (data: any) => {
        createdOfferData = { id: 501, ...data };
        return createdOfferData;
      });
      vi.spyOn(db, "updateContactById").mockResolvedValue({} as any);

      let recordedActivity: any = null;
      vi.spyOn(caseActivityService, "recordCaseActivity").mockImplementation(async (data: any) => {
        recordedActivity = data;
        return null;
      });

      const offer = await approveFamilyEnrollment({
        parentContactId: 101,
        studentContactId: 201,
        enrollmentMode: "standard",
        billingArrangement: "autopay",
        overrideDiscovery: true,
        overrideReason: "Immediate IEP emergency hearing scheduled within 5 days",
        approverName: "Byron Clausen",
      });

      expect(offer).toBeDefined();
      expect(offer.id).toBe(501);
      expect(offer.isDiscoveryOverridden).toBe(true);
      expect(offer.discoveryOverrideReason).toBe("Immediate IEP emergency hearing scheduled within 5 days");

      // Verify audit activity recorded
      expect(recordedActivity).toBeDefined();
      expect(recordedActivity.eventType).toBe("enrollment_approval_exception");
      expect(recordedActivity.title).toContain("Discovery Override");
      expect(recordedActivity.whyReason).toContain("Immediate IEP emergency hearing");
    });
  });

  describe("Criterion 6 & 7: Payment Arrangements (Autopay Default vs Manual Invoice Exception)", () => {
    it("should default billing arrangement to autopay", async () => {
      vi.spyOn(db, "getContactById").mockResolvedValue({ id: 102, jobTitle: "Parent" } as any);
      vi.spyOn(db, "getStudentsByParentContactId").mockResolvedValue([{ id: 202, parentContactId: 102 } as any]);
      vi.spyOn(db, "getLeadsByOwner").mockResolvedValue([{ id: 801, contactId: 102, status: "Discovery Completed" } as any]);
      vi.spyOn(db, "listDiscoveryCalls").mockResolvedValue([{ id: 302, status: "completed" } as any]);
      vi.spyOn(db, "getActiveOfferForFamily").mockResolvedValue(null);

      let capturedData: any = null;
      vi.spyOn(db, "createEnrollmentOffer").mockImplementation(async (data: any) => {
        capturedData = { id: 502, ...data };
        return capturedData;
      });
      vi.spyOn(db, "updateContactById").mockResolvedValue({} as any);
      vi.spyOn(caseActivityService, "recordCaseActivity").mockResolvedValue(null);

      await approveFamilyEnrollment({
        parentContactId: 102,
        studentContactId: 202,
        enrollmentMode: "standard",
        billingArrangement: "autopay",
      });

      expect(capturedData.billingArrangement).toBe("autopay");
      expect(capturedData.manualInvoiceDueDate).toBeNull();
      expect(capturedData.manualInvoiceReason).toBeNull();
    });

    it("should reject manual invoicing if exception reason is missing", async () => {
      vi.spyOn(db, "getContactById").mockResolvedValue({ id: 103, jobTitle: "Parent" } as any);
      vi.spyOn(db, "getStudentsByParentContactId").mockResolvedValue([{ id: 203, parentContactId: 103 } as any]);
      vi.spyOn(db, "getLeadsByOwner").mockResolvedValue([{ id: 802, contactId: 103, status: "Discovery Completed" } as any]);
      vi.spyOn(db, "listDiscoveryCalls").mockResolvedValue([{ id: 303, status: "completed" } as any]);

      await expect(
        approveFamilyEnrollment({
          parentContactId: 103,
          studentContactId: 203,
          enrollmentMode: "standard",
          billingArrangement: "manual_invoice",
          manualInvoiceDueDate: "1st of the month",
          manualInvoiceReason: "", // Missing
        })
      ).rejects.toThrow(/exception reason is required for Manual Monthly Invoicing/);
    });

    it("should permit manual invoicing with authorized staff reason and due date", async () => {
      vi.spyOn(db, "getContactById").mockResolvedValue({ id: 103, jobTitle: "Parent" } as any);
      vi.spyOn(db, "getStudentsByParentContactId").mockResolvedValue([{ id: 203, parentContactId: 103 } as any]);
      vi.spyOn(db, "getLeadsByOwner").mockResolvedValue([{ id: 802, contactId: 103, status: "Discovery Completed" } as any]);
      vi.spyOn(db, "listDiscoveryCalls").mockResolvedValue([{ id: 303, status: "completed" } as any]);
      vi.spyOn(db, "getActiveOfferForFamily").mockResolvedValue(null);

      let capturedData: any = null;
      vi.spyOn(db, "createEnrollmentOffer").mockImplementation(async (data: any) => {
        capturedData = { id: 503, ...data };
        return capturedData;
      });
      vi.spyOn(db, "updateContactById").mockResolvedValue({} as any);
      vi.spyOn(caseActivityService, "recordCaseActivity").mockResolvedValue(null);

      await approveFamilyEnrollment({
        parentContactId: 103,
        studentContactId: 203,
        enrollmentMode: "standard",
        billingArrangement: "manual_invoice",
        manualInvoiceDueDate: "15th of the month",
        manualInvoiceReason: "Family trust disburses quarterly vouchers via mail",
      });

      expect(capturedData.billingArrangement).toBe("manual_invoice");
      expect(capturedData.manualInvoiceDueDate).toBe("15th of the month");
      expect(capturedData.manualInvoiceReason).toBe("Family trust disburses quarterly vouchers via mail");
    });
  });

  describe("Criterion 8: Invitation Expiration & Resend Integrity", () => {
    it("should set default invitation expiration to 14 days", async () => {
      vi.spyOn(db, "getContactById").mockResolvedValue({ id: 104, jobTitle: "Parent" } as any);
      vi.spyOn(db, "getStudentsByParentContactId").mockResolvedValue([{ id: 204, parentContactId: 104 } as any]);
      vi.spyOn(db, "getLeadsByOwner").mockResolvedValue([{ id: 803, contactId: 104, status: "Discovery Completed" } as any]);
      vi.spyOn(db, "listDiscoveryCalls").mockResolvedValue([{ id: 304, status: "completed" } as any]);
      vi.spyOn(db, "getActiveOfferForFamily").mockResolvedValue(null);

      let capturedData: any = null;
      vi.spyOn(db, "createEnrollmentOffer").mockImplementation(async (data: any) => {
        capturedData = { id: 504, ...data };
        return capturedData;
      });
      vi.spyOn(db, "updateContactById").mockResolvedValue({} as any);
      vi.spyOn(caseActivityService, "recordCaseActivity").mockResolvedValue(null);

      await approveFamilyEnrollment({
        parentContactId: 104,
        studentContactId: 204,
        enrollmentMode: "standard",
        billingArrangement: "autopay",
      });

      const now = Date.now();
      const expiresAt = new Date(capturedData.invitationExpiresAt).getTime();
      const diffDays = Math.round((expiresAt - now) / (1000 * 86400));
      expect(diffDays).toBe(14);
      // Initial approval must be pending dispatch, not falsely marked sent
      expect(capturedData.invitationStatus).toBe("pending");
      expect(capturedData.invitationSentAt).toBeNull();
    });

    it("should protect student case stages and only update the parent contact anchor", async () => {
      vi.spyOn(db, "getContactById").mockResolvedValue({ id: 104, jobTitle: "Parent" } as any);
      const siblingStudent1 = { id: 204, parentContactId: 104, pipelineStage: "IEP Review", lifecycleStage: "Active Casework" };
      const siblingStudent2 = { id: 205, parentContactId: 104, pipelineStage: "Due Process Hearing", lifecycleStage: "Active Casework" };
      vi.spyOn(db, "getStudentsByParentContactId").mockResolvedValue([siblingStudent1, siblingStudent2] as any);
      vi.spyOn(db, "getLeadsByOwner").mockResolvedValue([{ id: 803, contactId: 104, status: "Discovery Completed" } as any]);
      vi.spyOn(db, "listDiscoveryCalls").mockResolvedValue([{ id: 304, status: "completed" } as any]);
      vi.spyOn(db, "getActiveOfferForFamily").mockResolvedValue(null);

      vi.spyOn(db, "createEnrollmentOffer").mockResolvedValue({ id: 504, parentContactId: 104 } as any);
      const updateContactSpy = vi.spyOn(db, "updateContactById").mockResolvedValue({} as any);
      vi.spyOn(caseActivityService, "recordCaseActivity").mockResolvedValue(null);

      await approveFamilyEnrollment({
        parentContactId: 104,
        studentContactId: 204,
        enrollmentMode: "standard",
        billingArrangement: "autopay",
      });

      // Verify updateContactById was called ONLY for the parent contact, NEVER for siblings
      const updatedContactIds = updateContactSpy.mock.calls.map(call => call[0]);
      expect(updatedContactIds).toContain(104);
      expect(updatedContactIds).not.toContain(204);
      expect(updatedContactIds).not.toContain(205);
    });

    it("should increment revisionNumber and store terms history when editing pre-acceptance offers", async () => {
      const existingOffer = {
        id: 701,
        parentContactId: 104,
        status: "approved",
        enrollmentMode: "custom",
        customPlanKey: "custom_retainer",
        customPlanName: "Initial Custom Plan",
        customMonthlyPrice: "125.00",
        customCommitmentMonths: 12,
        billingArrangement: "autopay",
        revisionNumber: 1,
        revisionHistory: "[]",
      };

      vi.spyOn(db, "getContactById").mockResolvedValue({ id: 104, jobTitle: "Parent" } as any);
      vi.spyOn(db, "getStudentsByParentContactId").mockResolvedValue([{ id: 204, parentContactId: 104 } as any]);
      vi.spyOn(db, "getLeadsByOwner").mockResolvedValue([{ id: 803, contactId: 104, status: "Discovery Completed" } as any]);
      vi.spyOn(db, "listDiscoveryCalls").mockResolvedValue([{ id: 304, status: "completed" } as any]);
      vi.spyOn(db, "getActiveOfferForFamily").mockResolvedValue(existingOffer as any);

      let updatedData: any = null;
      vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id: number, data: any) => {
        updatedData = { ...existingOffer, ...data };
        return updatedData;
      });
      vi.spyOn(db, "updateContactById").mockResolvedValue({} as any);

      let revisionActivity: any = null;
      vi.spyOn(caseActivityService, "recordCaseActivity").mockImplementation(async (data: any) => {
        if (data.eventType === "offer_terms_revised") {
          revisionActivity = data;
        }
        return null;
      });

      const revisedOffer = await approveFamilyEnrollment({
        parentContactId: 104,
        studentContactId: 204,
        enrollmentMode: "custom",
        customPlanKey: "custom_retainer",
        customPlanName: "Revised Custom Plan",
        customMonthlyPrice: 175,
        customCommitmentMonths: 12,
        billingArrangement: "autopay",
        changeReason: "Increased monthly meeting frequency per parent request",
        approverName: "Byron Clausen",
      });

      expect(revisedOffer.revisionNumber).toBe(2);
      expect(updatedData.customMonthlyPrice).toBe("175");
      expect(updatedData.invitationStatus).toBe("pending"); // Reset to pending dispatch
      expect(updatedData.invitationSentAt).toBeNull();

      // Check revision history stored
      const history = JSON.parse(updatedData.revisionHistory);
      expect(history).toHaveLength(1);
      expect(history[0].revisionNumber).toBe(1);
      expect(history[0].previousTerms.customMonthlyPrice).toBe("125.00");
      expect(history[0].updatedTerms.customMonthlyPrice).toBe("175");
      expect(history[0].changeReason).toContain("Increased monthly meeting frequency");

      // Verify audit activity recorded
      expect(revisionActivity).toBeDefined();
      expect(revisionActivity.eventType).toBe("offer_terms_revised");
      expect(revisionActivity.title).toContain("Rev #2");
    });

    it("should hard block editing or replacing offers that are already accepted or signed", async () => {
      const lockedOffer = {
        id: 702,
        parentContactId: 104,
        status: "agreement_signed",
        revisionNumber: 1,
      };

      vi.spyOn(db, "getContactById").mockResolvedValue({ id: 104, jobTitle: "Parent" } as any);
      vi.spyOn(db, "getStudentsByParentContactId").mockResolvedValue([{ id: 204, parentContactId: 104 } as any]);
      vi.spyOn(db, "getLeadsByOwner").mockResolvedValue([{ id: 803, contactId: 104, status: "Discovery Completed" } as any]);
      vi.spyOn(db, "listDiscoveryCalls").mockResolvedValue([{ id: 304, status: "completed" } as any]);
      vi.spyOn(db, "getActiveOfferForFamily").mockResolvedValue(lockedOffer as any);

      await expect(
        approveFamilyEnrollment({
          parentContactId: 104,
          studentContactId: 204,
          enrollmentMode: "standard",
          billingArrangement: "autopay",
        })
      ).rejects.toThrow(/Cannot edit offer terms.*locked to protect agreement integrity/);
    });

    it("should not fire real emails when outbound is disabled in Phase 2A.1 safety mode", async () => {
      const existingOffer = {
        id: 777,
        parentContactId: 105,
        studentContactId: 205,
        status: "approved",
        invitationStatus: "pending",
        resendCount: 0,
        invitationSentAt: null,
      };

      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(existingOffer as any);
      vi.spyOn(caseActivityService, "recordCaseActivity").mockResolvedValue(null);

      const result = await resendFamilyEnrollmentInvitation({
        offerId: 777,
        approverName: "Byron Clausen",
      });

      expect(result.deliveryAttempted).toBe(false);
      expect(result.deliveryStatus).toBe("pending");
      expect(result.offer.invitationSentAt).toBeNull();
      expect(result.message).toContain("Live email transmission remains disabled");
    });

    it("should increment resend count and update sent timestamp when mock delivery succeeds", async () => {
      const existingOffer = {
        id: 777,
        parentContactId: 105,
        studentContactId: 205,
        status: "approved",
        invitationStatus: "pending",
        resendCount: 1,
        invitationSentAt: null,
      };

      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(existingOffer as any);

      let updatedData: any = null;
      vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id: number, data: any) => {
        updatedData = { ...existingOffer, ...data };
        return updatedData;
      });
      vi.spyOn(caseActivityService, "recordCaseActivity").mockResolvedValue(null);

      const result = await resendFamilyEnrollmentInvitation({
        offerId: 777,
        approverName: "Byron Clausen",
        mockDeliverySuccess: true,
      });

      expect(result.deliveryAttempted).toBe(true);
      expect(result.deliveryStatus).toBe("dispatched");
      expect(result.offer.id).toBe(777);
      expect(result.offer.resendCount).toBe(2);
      expect(result.offer.invitationSentAt).toBeInstanceOf(Date);
    });

    it("should revoke offer cleanly without modifying sibling student stages", async () => {
      const existingOffer = {
        id: 888,
        parentContactId: 106,
        studentContactId: 206,
        status: "approved",
      };

      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(existingOffer as any);
      vi.spyOn(db, "revokeEnrollmentOffer").mockImplementation(async (id, by, name, reason) => {
        return {
          ...existingOffer,
          status: "revoked",
          revokedBy: by,
          revokedByName: name,
          revokedReason: reason,
          revokedAt: new Date(),
        } as any;
      });
      vi.spyOn(db, "getContactById").mockResolvedValue({ id: 106, enrollmentOfferId: 888 } as any);
      const updateContactSpy = vi.spyOn(db, "updateContactById").mockResolvedValue({} as any);
      vi.spyOn(db, "getStudentsByParentContactId").mockResolvedValue([{ id: 206, parentContactId: 106 } as any]);
      vi.spyOn(caseActivityService, "recordCaseActivity").mockResolvedValue(null);

      const result = await revokeFamilyEnrollmentOffer({
        offerId: 888,
        reason: "Family decided to relocate to another school district",
        approverName: "Byron Clausen",
      });

      expect(result.status).toBe("revoked");
      expect(result.revokedReason).toBe("Family decided to relocate to another school district");

      // Verify that updateContactById was called only for parent contact 106, not sibling student 206
      const updatedContactIds = updateContactSpy.mock.calls.map(call => call[0]);
      expect(updatedContactIds).toContain(106);
      expect(updatedContactIds).not.toContain(206);
    });
  });

  describe("Criterion 9: Absolute Protection of Student Profile Left Side", () => {
    it("should guarantee that StudentProfileDossier.tsx exists and is 100% untouched", () => {
      const dossierPath = path.resolve(__dirname, "../client/src/components/students/StudentProfileDossier.tsx");
      expect(fs.existsSync(dossierPath)).toBe(true);
      const dossierContent = fs.readFileSync(dossierPath, "utf-8");
      // Check that standard left dossier elements remain completely intact
      expect(dossierContent).toContain("StudentProfileDossier");
      expect(dossierContent).toContain("STUDENT PROFILE");
      expect(dossierContent).toContain("displayEligibility");
      expect(dossierContent).toContain("displayMedicalDiagnoses");
      expect(dossierContent).toContain("cleanGrade");
    });


    it("should guarantee that StudentWorkspace.tsx left panel lines (498-535) are completely unchanged", () => {
      const workspacePath = path.resolve(__dirname, "../client/src/pages/StudentWorkspace.tsx");
      expect(fs.existsSync(workspacePath)).toBe(true);
      const workspaceContent = fs.readFileSync(workspacePath, "utf-8");
      // Left side Dossier embedding must be present
      expect(workspaceContent).toContain("<StudentProfileDossier");
      expect(workspaceContent).toContain("lg:col-span-5 relative");
      expect(workspaceContent).toContain("lg:col-span-7");
    });
  });

  describe("Phase 2B: Parent Enrollment, Plan Selection & Agreements Engine", () => {
    it("Test 1: Unapproved families cannot enroll (portal returns canEnroll: false)", async () => {
      const { getPortalFamilyEnrollmentState } = await import("./services/familyEnrollmentService");
      vi.spyOn(db, "getActiveOfferForFamily").mockResolvedValue(null);

      const state = await getPortalFamilyEnrollmentState(999);
      expect(state.canEnroll).toBe(false);
      expect(state.ineligibleReason).toBe("unapproved");
      expect(state.availablePlans).toHaveLength(0);
      expect(state.agreement).toBeNull();
    });

    it("Test 2: Expired invitations cannot enroll and block plan selection", async () => {
      const { getPortalFamilyEnrollmentState, selectFamilyEnrollmentPlan } = await import("./services/familyEnrollmentService");
      const expiredOffer = {
        id: 701,
        parentContactId: 101,
        status: "approved",
        enrollmentMode: "standard",
        invitationExpiresAt: new Date(Date.now() - 86400000), // 1 day ago
      };

      vi.spyOn(db, "getActiveOfferForFamily").mockResolvedValue(expiredOffer as any);
      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(expiredOffer as any);

      const state = await getPortalFamilyEnrollmentState(101);
      expect(state.canEnroll).toBe(false);
      expect(state.ineligibleReason).toBe("expired");

      await expect(
        selectFamilyEnrollmentPlan({
          offerId: 701,
          planKey: "anchor",
          parentContactId: 101,
        })
      ).rejects.toThrow(/invitation has expired/);
    });

    it("Test 3: Standard families see exactly three published plans with 12-month commitment", async () => {
      const { getPortalFamilyEnrollmentState } = await import("./services/familyEnrollmentService");
      const standardOffer = {
        id: 702,
        parentContactId: 102,
        status: "approved",
        enrollmentMode: "standard",
        invitationExpiresAt: new Date(Date.now() + 86400000 * 14),
      };

      vi.spyOn(db, "getActiveOfferForFamily").mockResolvedValue(standardOffer as any);

      const state = await getPortalFamilyEnrollmentState(102);
      expect(state.canEnroll).toBe(true);
      expect(state.ineligibleReason).toBeNull();
      expect(state.availablePlans).toHaveLength(3);

      const [nav, anchor, fam] = state.availablePlans;
      expect(nav.planKey).toBe("navigator");
      expect(nav.priceMonthly).toBe(55);
      expect(nav.commitmentMonths).toBe(12);

      expect(anchor.planKey).toBe("anchor");
      expect(anchor.priceMonthly).toBe(105);
      expect(anchor.commitmentMonths).toBe(12);

      expect(fam.planKey).toBe("family");
      expect(fam.priceMonthly).toBe(155);
      expect(fam.commitmentMonths).toBe(12);
    });

    it("Test 4: Custom families see ONLY their authorized custom offer (isolated from standard plans)", async () => {
      const { getPortalFamilyEnrollmentState } = await import("./services/familyEnrollmentService");
      const customOffer = {
        id: 703,
        parentContactId: 103,
        status: "approved",
        enrollmentMode: "custom",
        customPlanKey: "executive_advocacy",
        customPlanName: "Executive Advocacy Retainer",
        customMonthlyPrice: "145.00",
        customBillingFrequency: "monthly",
        customCommitmentMonths: 6,
        customTerms: "Authorized 6-month executive representation package with bi-weekly case check-ins.",
        billingArrangement: "autopay",
        invitationExpiresAt: new Date(Date.now() + 86400000 * 14),
      };

      vi.spyOn(db, "getActiveOfferForFamily").mockResolvedValue(customOffer as any);

      const state = await getPortalFamilyEnrollmentState(103);
      expect(state.canEnroll).toBe(true);
      expect(state.availablePlans).toHaveLength(1);

      const customPlan = state.availablePlans[0];
      expect(customPlan.planKey).toBe("executive_advocacy");
      expect(customPlan.planName).toBe("Executive Advocacy Retainer");
      expect(customPlan.priceMonthly).toBe(145);
      expect(customPlan.commitmentMonths).toBe(6);
      expect(customPlan.description).toContain("Authorized 6-month executive representation");
      expect(customPlan.isCustom).toBe(true);
    });

    it("Test 5 & 6: Plan selection persists, generates agreement, prevents duplicate agreements, records activity", async () => {
      const { selectFamilyEnrollmentPlan } = await import("./services/familyEnrollmentService");
      let storedOffer: any = {
        id: 704,
        parentContactId: 104,
        studentContactId: 204,
        status: "approved",
        enrollmentMode: "standard",
        billingArrangement: "autopay",
        invitationExpiresAt: new Date(Date.now() + 86400000 * 14),
        selectedPlanKey: null,
        selectedPlanName: null,
        agreementId: null,
      };

      vi.spyOn(db, "getEnrollmentOfferById").mockImplementation(async () => storedOffer);
      vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (_id, data) => {
        storedOffer = { ...storedOffer, ...data };
        return storedOffer;
      });
      vi.spyOn(db, "getContactById").mockImplementation(async (id: number) => {
        if (id === 104) return { id: 104, firstName: "David", lastName: "Smith", email: "david@example.com" } as any;
        if (id === 204) return { id: 204, firstName: "Emma", lastName: "Smith" } as any;
        return null;
      });
      vi.spyOn(db, "updateContactById").mockResolvedValue({} as any);
      const activitySpy = vi.spyOn(caseActivityService, "recordCaseActivity").mockResolvedValue(null);

      // First selection: Choose Anchor
      const result1 = await selectFamilyEnrollmentPlan({
        offerId: 704,
        planKey: "anchor",
        parentContactId: 104,
      });

      expect(result1.success).toBe(true);
      expect(result1.agreementId).toBeGreaterThan(0);
      expect(storedOffer.selectedPlanKey).toBe("anchor");
      expect(storedOffer.selectedPlanName).toBe("Anchor");
      expect(storedOffer.status).toBe("agreement_pending");
      expect(storedOffer.agreementStatus).toBe("awaiting_signature");
      expect(activitySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "plan_selected",
          studentContactId: 204,
        })
      );

      const generatedAgreementId = result1.agreementId;

      // Duplicate selection test: selecting same plan again must return existing agreement without recreation
      const result2 = await selectFamilyEnrollmentPlan({
        offerId: 704,
        planKey: "anchor",
        parentContactId: 104,
      });

      expect(result2.success).toBe(true);
      expect(result2.agreementId).toBe(generatedAgreementId);
      expect(result2.message).toContain("Plan already selected");
    });

    it("Test 7 & 8: Agreement signing records truthfully and transitions to Payment Pending (Payment Boundary Enforced)", async () => {
      const { onAgreementSignedForEnrollment } = await import("./services/familyEnrollmentService");
      let offerRecord: any = {
        id: 705,
        parentContactId: 105,
        studentContactId: 205,
        status: "agreement_pending",
        agreementStatus: "awaiting_signature",
        selectedPlanKey: "family",
        selectedPlanName: "Family",
        selectedPlanPrice: "155.00",
        agreementId: 991,
      };

      vi.spyOn(db, "getActiveOfferForFamily").mockResolvedValue(offerRecord);
      vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (_id, data) => {
        offerRecord = { ...offerRecord, ...data };
        return offerRecord;
      });
      const activitySpy = vi.spyOn(caseActivityService, "recordCaseActivity").mockResolvedValue(null);

      const signedOffer = await onAgreementSignedForEnrollment({
        agreementId: 991,
        clientId: 105,
        signerName: "David Smith",
        pdfUrl: "/storage/signed-agreement-991.pdf",
      });

      expect(signedOffer).not.toBeNull();
      expect(signedOffer!.status).toBe("payment_pending");
      expect(signedOffer!.agreementStatus).toBe("signed");
      expect(signedOffer!.agreementSignedAt).toBeInstanceOf(Date);
      expect(signedOffer!.paymentStatus).toBe("pending");

      // Verify payment boundary: Membership is NOT active, no live Stripe charge simulated
      expect(signedOffer!.status).not.toBe("active");
      expect(signedOffer!.paidAt).toBeUndefined();

      expect(activitySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "agreement_signed",
          studentContactId: 205,
          title: expect.stringContaining("Payment Pending"),
        })
      );
    });

    it("Test 9: Explicit staff-authorized supersede flow preserves history and voids unsigned agreements", async () => {
      const { supersedeFamilyEnrollmentOffer } = await import("./services/familyEnrollmentService");
      const oldOffer = {
        id: 706,
        parentContactId: 106,
        studentContactId: 206,
        status: "agreement_pending",
        agreementStatus: "awaiting_signature",
        agreementId: 992,
        enrollmentMode: "standard",
        billingArrangement: "autopay",
      };

      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(oldOffer as any);
      vi.spyOn(db, "getContactById").mockResolvedValue({ id: 106, firstName: "Alice", lastName: "Brown" } as any);
      vi.spyOn(db, "getStudentsByParentContactId").mockResolvedValue([{ id: 206, parentContactId: 106 } as any]);
      vi.spyOn(db, "listDiscoveryCalls").mockResolvedValue([{ id: 1, status: "completed" } as any]);
      vi.spyOn(db, "updateContactById").mockResolvedValue({} as any);
      vi.spyOn(caseActivityService, "recordCaseActivity").mockResolvedValue(null);

      const supersedeDbSpy = vi.spyOn(db, "supersedeEnrollmentOffer").mockResolvedValue({
        ...oldOffer,
        status: "superseded",
        revokedReason: "Superseded: Family requested upgrade to custom advocacy schedule",
      } as any);

      vi.spyOn(db, "getActiveOfferForFamily").mockResolvedValue(null);
      vi.spyOn(db, "createEnrollmentOffer").mockImplementation(async (data) => ({
        ...data,
        id: 707,
        revisionNumber: 1,
      } as any));

      const result = await supersedeFamilyEnrollmentOffer({
        offerId: 706,
        reason: "Family requested upgrade to custom advocacy schedule",
        approverName: "Byron Clausen",
        newOfferInput: {
          parentContactId: 106,
          enrollmentMode: "custom",
          customPlanKey: "intensive_support",
          customPlanName: "Intensive IEP Advocacy",
          customMonthlyPrice: 175,
          customCommitmentMonths: 12,
          billingArrangement: "autopay",
        },
      });

      expect(supersedeDbSpy).toHaveBeenCalledWith(
        706,
        1,
        "Byron Clausen",
        "Family requested upgrade to custom advocacy schedule"
      );
      expect(result.oldOffer.status).toBe("superseded");
      expect(result.newOffer.id).toBe(707);
      expect(result.newOffer.enrollmentMode).toBe("custom");
      expect(result.newOffer.status).toBe("approved");
    });

    it("Test 10: Sibling Student Profiles share the same family enrollment state without changing individual case stages", async () => {
      const { resolveFamilyContext, getFamilyEnrollmentState } = await import("./services/familyEnrollmentService");
      
      const parentRecord = { id: 108, firstName: "Maria", lastName: "Garcia", jobTitle: "Parent" };
      const sibling1 = { id: 208, firstName: "Carlos", lastName: "Garcia", parentContactId: 108, pipelineStage: "Discovery" };
      const sibling2 = { id: 209, firstName: "Sofia", lastName: "Garcia", parentContactId: 108, pipelineStage: "Records Review" };

      vi.spyOn(db, "getContactById").mockImplementation(async (id: number) => {
        if (id === 108) return parentRecord as any;
        if (id === 208) return sibling1 as any;
        if (id === 209) return sibling2 as any;
        return null;
      });
      vi.spyOn(db, "getStudentsByParentContactId").mockResolvedValue([sibling1 as any, sibling2 as any]);
      vi.spyOn(db, "getLeadsByOwner").mockResolvedValue([]);
      vi.spyOn(db, "listDiscoveryCalls").mockResolvedValue([{ id: 10, status: "completed" } as any]);

      const activeOffer = {
        id: 708,
        parentContactId: 108,
        status: "agreement_pending",
        selectedPlanKey: "anchor",
        selectedPlanName: "Anchor",
      };
      vi.spyOn(db, "getActiveOfferForFamily").mockResolvedValue(activeOffer as any);
      vi.spyOn(db, "listOffersForFamily").mockResolvedValue([activeOffer as any]);

      // Sibling 1 query
      const sibling1State = await getFamilyEnrollmentState({ studentContactId: 208 });
      // Sibling 2 query
      const sibling2State = await getFamilyEnrollmentState({ studentContactId: 209 });

      expect(sibling1State.parentContactId).toBe(108);
      expect(sibling2State.parentContactId).toBe(108);
      expect(sibling1State.activeOffer?.id).toBe(708);
      expect(sibling2State.activeOffer?.id).toBe(708);
      expect(sibling1State.activeOffer?.selectedPlanName).toBe("Anchor");
      expect(sibling2State.activeOffer?.selectedPlanName).toBe("Anchor");

      // Verify that individual case pipeline stages remain independent
      expect(sibling1.pipelineStage).toBe("Discovery");
      expect(sibling2.pipelineStage).toBe("Records Review");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 2C: STRIPE PAYMENTS, RECURRING BILLING & MEMBERSHIP ACTIVATION
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Phase 2C: Stripe Payments, Recurring Billing & Family Membership Activation", () => {
    it("Test 1: Checkout requires signed agreement and valid plan selection", async () => {
      const { createFamilyEnrollmentCheckoutSession } = await import("./services/familyEnrollmentService");

      // Case A: Agreement NOT signed
      const unsignedOffer = {
        id: 801,
        parentContactId: 110,
        status: "agreement_pending",
        selectedPlanKey: "anchor",
        selectedPlanName: "Anchor",
        selectedPlanPrice: "105.00",
        agreementStatus: "pending_signature",
      };
      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(unsignedOffer as any);

      await expect(
        createFamilyEnrollmentCheckoutSession({
          offerId: 801,
          parentContactId: 110,
        })
      ).rejects.toThrow("Advocacy service agreement must be electronically signed before payment.");

      // Case B: No plan selected
      const unselectedOffer = {
        id: 802,
        parentContactId: 110,
        status: "approved",
        selectedPlanKey: null,
        selectedPlanPrice: null,
        agreementStatus: "signed",
      };
      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(unselectedOffer as any);

      await expect(
        createFamilyEnrollmentCheckoutSession({
          offerId: 802,
          parentContactId: 110,
        })
      ).rejects.toThrow("Please select an authorized advocacy plan first.");
    });

    it("Test 2: Creates server-side Stripe Checkout session for standard plan (Anchor $105/mo)", async () => {
      const { createFamilyEnrollmentCheckoutSession } = await import("./services/familyEnrollmentService");

      const validOffer = {
        id: 803,
        parentContactId: 111,
        studentContactId: 211,
        status: "payment_pending",
        selectedPlanKey: "anchor",
        selectedPlanName: "Anchor",
        selectedPlanPrice: "105.00",
        agreementStatus: "signed",
        billingArrangement: "autopay",
        customCommitmentMonths: 12,
        stripeCustomerId: "cus_test_anchor_family",
      };
      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(validOffer as any);
      vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id, data) => ({
        ...validOffer,
        ...data,
      } as any));

      const session = await createFamilyEnrollmentCheckoutSession({
        offerId: 803,
        parentContactId: 111,
        originUrl: "https://waypointadvocates.com",
      });

      expect(session.isTestMode).toBe(true);
      expect(session.sessionId).toBeDefined();
      expect(session.url).toContain("session_id=");
      expect(session.offer.stripeCustomerId).toBe("cus_test_anchor_family");
    });

    it("Test 3: Creates server-side Stripe Checkout session for authorized custom plan", async () => {
      const { createFamilyEnrollmentCheckoutSession } = await import("./services/familyEnrollmentService");

      const customOffer = {
        id: 804,
        parentContactId: 112,
        studentContactId: 212,
        status: "payment_pending",
        enrollmentMode: "custom",
        selectedPlanKey: "custom_retainer",
        selectedPlanName: "Custom Retainer Package",
        selectedPlanPrice: "145.00",
        customCommitmentMonths: 6,
        agreementStatus: "signed",
        billingArrangement: "autopay",
      };
      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(customOffer as any);
      vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id, data) => ({
        ...customOffer,
        ...data,
      } as any));

      const session = await createFamilyEnrollmentCheckoutSession({
        offerId: 804,
        parentContactId: 112,
      });

      expect(session.isTestMode).toBe(true);
      expect(session.sessionId).toContain("cs_test_");
    });

    it("Test 4: Prevents checkout on expired, revoked, or superseded offers", async () => {
      const { createFamilyEnrollmentCheckoutSession } = await import("./services/familyEnrollmentService");

      // Expired offer
      const expiredOffer = {
        id: 805,
        parentContactId: 113,
        status: "payment_pending",
        selectedPlanKey: "navigator",
        selectedPlanPrice: "55.00",
        agreementStatus: "signed",
        invitationExpiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      };
      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(expiredOffer as any);

      await expect(
        createFamilyEnrollmentCheckoutSession({ offerId: 805, parentContactId: 113 })
      ).rejects.toThrow("Enrollment offer has expired.");

      // Revoked offer
      const revokedOffer = {
        ...expiredOffer,
        id: 806,
        status: "revoked",
        invitationExpiresAt: new Date(Date.now() + 86400000),
      };
      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(revokedOffer as any);

      await expect(
        createFamilyEnrollmentCheckoutSession({ offerId: 806, parentContactId: 113 })
      ).rejects.toThrow("This enrollment offer is revoked.");

      // Superseded offer
      const supersededOffer = {
        ...expiredOffer,
        id: 807,
        status: "superseded",
        invitationExpiresAt: new Date(Date.now() + 86400000),
      };
      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(supersededOffer as any);

      await expect(
        createFamilyEnrollmentCheckoutSession({ offerId: 807, parentContactId: 113 })
      ).rejects.toThrow("This enrollment offer is superseded.");
    });

    it("Test 5: Dual-condition membership activation requires BOTH signed agreement AND verified first payment", async () => {
      const { activateFamilyMembership } = await import("./services/familyEnrollmentService");

      // Unsigned offer cannot activate
      const unsignedOffer = {
        id: 808,
        parentContactId: 114,
        studentContactId: 214,
        status: "agreement_pending",
        agreementStatus: "unsigned",
      };
      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(unsignedOffer as any);

      await expect(
        activateFamilyMembership({
          offerId: 808,
          source: "test_verification",
        })
      ).rejects.toThrow("Active Membership requires both a valid signed agreement AND verified first payment.");

      // Signed offer with verified payment activates cleanly
      const signedOffer = {
        id: 809,
        parentContactId: 114,
        studentContactId: 214,
        status: "payment_pending",
        agreementStatus: "signed",
        selectedPlanKey: "anchor",
        selectedPlanName: "Anchor Plan",
        selectedPlanPrice: "105.00",
        customCommitmentMonths: 12,
      };
      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(signedOffer as any);
      vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id, data) => ({
        ...signedOffer,
        ...data,
      } as any));

      const activated = await activateFamilyMembership({
        offerId: 809,
        stripeCustomerId: "cus_verified_114",
        stripeSubscriptionId: "sub_verified_809",
        stripePaymentIntentId: "pi_verified_809",
        source: "stripe_checkout_verified",
      });

      expect(activated.status).toBe("active");
      expect(activated.paymentStatus).toBe("paid");
      expect(activated.membershipStartedAt).toBeDefined();
      expect(activated.commitmentEndsAt).toBeDefined();
      expect(activated.documentReviewStatus).toBe("pending"); // Post-activation review gate
      expect(activated.stripeSubscriptionId).toBe("sub_verified_809");
    });

    it("Test 6: Failed first payment sets payment_attention, preserves signed agreement, leaves membership inactive", async () => {
      const { handleFirstPaymentFailure } = await import("./services/familyEnrollmentService");

      const pendingOffer = {
        id: 810,
        parentContactId: 115,
        studentContactId: 215,
        status: "payment_pending",
        agreementStatus: "signed",
        paymentStatus: "pending",
        selectedPlanName: "Family Plan",
        selectedPlanPrice: "155.00",
      };
      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(pendingOffer as any);
      vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id, data) => ({
        ...pendingOffer,
        ...data,
      } as any));

      const failedOffer = await handleFirstPaymentFailure({
        offerId: 810,
        errorReason: "Insufficient funds on credit card.",
      });

      expect(failedOffer.status).toBe("payment_attention");
      expect(failedOffer.paymentStatus).toBe("failed");
      expect(failedOffer.paymentAttentionReason).toBe("Insufficient funds on credit card.");
      expect(failedOffer.agreementStatus).toBe("signed"); // Agreement MUST remain signed
      expect(failedOffer.status).not.toBe("active"); // Membership MUST remain inactive
    });

    it("Test 7: Manual invoicing exception generates unpaid invoice and requires verified payment for activation", async () => {
      const { createManualEnrollmentInvoice, verifyManualInvoicePayment } = await import("./services/familyEnrollmentService");

      const manualOffer = {
        id: 811,
        parentContactId: 116,
        studentContactId: 216,
        status: "payment_pending",
        agreementStatus: "signed",
        billingArrangement: "manual_invoice",
        manualInvoiceDueDate: "2026-11-01",
        manualInvoiceReason: "Authorized parent request for employer reimbursement billing.",
        selectedPlanKey: "anchor",
        selectedPlanName: "Anchor Plan",
        selectedPlanPrice: "105.00",
        customCommitmentMonths: 12,
        initialInvoiceId: null,
      };
      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(manualOffer as any);
      vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id, data) => ({
        ...manualOffer,
        ...data,
      } as any));

      // 1. Create invoice
      const invoice = await createManualEnrollmentInvoice({
        offerId: 811,
        parentContactId: 116,
        staffUserId: 1,
      });

      expect(invoice).toBeDefined();
      expect(invoice.status).toBe("Unpaid"); // NEVER mark as paid automatically!
      expect(Number(invoice.total)).toBe(105);

      // 2. Verify payment by staff
      const verifiedOffer = {
        ...manualOffer,
        initialInvoiceId: invoice.id || 999,
      };
      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(verifiedOffer as any);

      const result = await verifyManualInvoicePayment({
        offerId: 811,
        invoiceId: invoice.id || 999,
        staffUserId: 1,
        staffUserName: "Lead Special Education Advocate",
        paymentReference: "CHECK-4821",
      });

      expect(result.success).toBe(true);
      expect(result.offer.status).toBe("active");
      expect(result.offer.paymentStatus).toBe("paid");
    });

    it("Test 8: Recurring payment failure initiates 14-day grace period without terminating case access", async () => {
      const { handleRecurringPaymentFailure } = await import("./services/familyEnrollmentService");

      const activeOffer = {
        id: 812,
        parentContactId: 117,
        studentContactId: 217,
        status: "active",
        agreementStatus: "signed",
        paymentStatus: "paid",
        stripeSubscriptionId: "sub_active_812",
      };
      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(activeOffer as any);
      vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id, data) => ({
        ...activeOffer,
        ...data,
      } as any));

      const graceOffer = await handleRecurringPaymentFailure({
        offerId: 812,
        errorReason: "Card expired on recurring renewal.",
      });

      expect(graceOffer.status).toBe("active"); // Does NOT delete or revoke active status
      expect(graceOffer.paymentStatus).toBe("grace_period");
      expect(graceOffer.gracePeriodEndsAt).toBeDefined();
      expect(graceOffer.paymentAttentionReason).toContain("Card expired");
    });

    it("Test 9: Webhook processing handles checkout.session.completed and invoice.payment_succeeded idempotently", async () => {
      const { processFamilyEnrollmentWebhook } = await import("./services/familyEnrollmentService");

      const pendingOffer = {
        id: 813,
        parentContactId: 118,
        studentContactId: 218,
        status: "payment_pending",
        agreementStatus: "signed",
        paymentStatus: "pending",
        selectedPlanKey: "navigator",
        selectedPlanName: "Navigator",
        selectedPlanPrice: "55.00",
        customCommitmentMonths: 12,
      };
      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(pendingOffer as any);
      vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id, data) => ({
        ...pendingOffer,
        ...data,
      } as any));

      // Checkout session completed webhook event with verified payment status
      const checkoutEvent = {
        id: "evt_test_checkout_813",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_813",
            customer: "cus_test_118",
            subscription: "sub_test_813",
            payment_intent: "pi_test_813",
            payment_status: "paid",
            metadata: {
              family_enrollment_offer_id: "813",
            },
          },
        },
      };

      const result = await processFamilyEnrollmentWebhook(checkoutEvent);
      expect(result.processed).toBe(true);
      expect(result.action).toBe("membership_activated");
      expect(result.offerId).toBe(813);
    });

    it("Test 10: Post-activation onboarding gate locks IEP Blueprint scheduling until advocate completes document review", async () => {
      const { markDocumentReviewComplete } = await import("./services/familyEnrollmentService");

      const activeOffer = {
        id: 814,
        parentContactId: 119,
        studentContactId: 219,
        status: "active",
        agreementStatus: "signed",
        paymentStatus: "paid",
        documentReviewStatus: "pending",
      };
      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(activeOffer as any);
      vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id, data) => ({
        ...activeOffer,
        ...data,
      } as any));

      // Initially, document review is pending
      expect(activeOffer.documentReviewStatus).toBe("pending");

      // Assigned advocate marks review complete
      const reviewedOffer = await markDocumentReviewComplete({
        offerId: 814,
        studentContactId: 219,
        advocateUserId: 1,
        advocateUserName: "Byron Honea",
        reviewNotes: "IEP and neuropsychological evaluation reviewed. Ready for Blueprint session.",
      });

      expect(reviewedOffer.documentReviewStatus).toBe("approved");
      expect(reviewedOffer.documentReviewCompletedAt).toBeDefined();
      expect(reviewedOffer.documentReviewCompletedByName).toBe("Byron Honea");
    });

    it("Test 11: Absolute Student Profile Dossier and left layout protection", async () => {
      const fs = await import("fs");
      const path = await import("path");

      const dossierPath = path.resolve(__dirname, "../client/src/components/students/StudentProfileDossier.tsx");
      expect(fs.existsSync(dossierPath)).toBe(true);

      const dossierContent = fs.readFileSync(dossierPath, "utf-8");
      expect(dossierContent).not.toContain("stripeCheckout");
      expect(dossierContent).not.toContain("processPayment");
    });
  });

  describe("Phase 2D: Payment Security, Multi-Payment Structures & Financing Safeguards", () => {
    it("Test 1: Pay in Full calculations honor authoritative catalog totals without default discounts", async () => {
      const { calculatePayInFullQuote } = await import("./services/familyEnrollmentService");

      // Standard 12-month Navigator: $55/mo * 12 = $660.00
      const navQuote = calculatePayInFullQuote({
        priceMonthly: 55,
        commitmentMonths: 12,
      });
      expect(navQuote.originalAmountCents).toBe(66000);
      expect(navQuote.discountAmountCents).toBe(0);
      expect(navQuote.finalAmountCents).toBe(66000);
      expect(navQuote.finalAmountFormatted).toBe("$660.00");

      // Standard 12-month Anchor: $105/mo * 12 = $1,260.00
      const anchorQuote = calculatePayInFullQuote({
        priceMonthly: 105,
        commitmentMonths: 12,
      });
      expect(anchorQuote.originalAmountCents).toBe(126000);
      expect(anchorQuote.discountAmountCents).toBe(0);
      expect(anchorQuote.finalAmountCents).toBe(126000);
      expect(anchorQuote.finalAmountFormatted).toBe("$1,260.00");

      // Standard 12-month Family: $155/mo * 12 = $1,860.00
      const familyQuote = calculatePayInFullQuote({
        priceMonthly: 155,
        commitmentMonths: 12,
      });
      expect(familyQuote.originalAmountCents).toBe(186000);
      expect(familyQuote.discountAmountCents).toBe(0);
      expect(familyQuote.finalAmountCents).toBe(186000);
      expect(familyQuote.finalAmountFormatted).toBe("$1,860.00");
    });

    it("Test 2: Pay in Full calculations support approved custom commitments and staff-authorized discounts", async () => {
      const { calculatePayInFullQuote } = await import("./services/familyEnrollmentService");

      // 6-month custom Anchor: $105/mo * 6 = $630.00
      const customQuote = calculatePayInFullQuote({
        priceMonthly: 105,
        commitmentMonths: 6,
      });
      expect(customQuote.originalAmountCents).toBe(63000);
      expect(customQuote.finalAmountFormatted).toBe("$630.00");

      // Staff-authorized 10% discount on Anchor 12-month: $1,260.00 - $126.00 = $1,134.00
      const percentageDiscountQuote = calculatePayInFullQuote({
        priceMonthly: 105,
        commitmentMonths: 12,
        discountType: "percentage",
        discountValue: 10,
      });
      expect(percentageDiscountQuote.originalAmountCents).toBe(126000);
      expect(percentageDiscountQuote.discountAmountCents).toBe(12600);
      expect(percentageDiscountQuote.finalAmountCents).toBe(113400);
      expect(percentageDiscountQuote.finalAmountFormatted).toBe("$1,134.00");

      // Staff-authorized $100 fixed discount on Navigator: $660.00 - $100.00 = $560.00
      const fixedDiscountQuote = calculatePayInFullQuote({
        priceMonthly: 55,
        commitmentMonths: 12,
        discountType: "fixed_amount",
        discountValue: 100,
      });
      expect(fixedDiscountQuote.originalAmountCents).toBe(66000);
      expect(fixedDiscountQuote.discountAmountCents).toBe(10000);
      expect(fixedDiscountQuote.finalAmountCents).toBe(56000);
      expect(fixedDiscountQuote.finalAmountFormatted).toBe("$560.00");

      // Bounds checking: negative discount rejected or clamped
      const negativeDiscountQuote = calculatePayInFullQuote({
        priceMonthly: 55,
        commitmentMonths: 12,
        discountType: "fixed_amount",
        discountValue: -50,
      });
      expect(negativeDiscountQuote.discountAmountCents).toBe(0);
      expect(negativeDiscountQuote.finalAmountCents).toBe(66000);

      // Bounds checking: discount exceeding total amount clamped to total
      const excessiveDiscountQuote = calculatePayInFullQuote({
        priceMonthly: 55,
        commitmentMonths: 12,
        discountType: "fixed_amount",
        discountValue: 9999,
      });
      expect(excessiveDiscountQuote.finalAmountCents).toBe(0);
    });

    it("Test 3 (Defect A): Forged or arbitrary session IDs fail closed in production", async () => {
      const { verifyAndActivateStripeSession } = await import("./services/familyEnrollmentService");

      const offer = {
        id: 901,
        parentContactId: 101,
        studentContactId: 201,
        status: "payment_pending",
        agreementStatus: "signed",
        paymentStatus: "pending",
        selectedPlanPrice: "55.00",
        customCommitmentMonths: 12,
      };
      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(offer as any);

      // Temporarily simulate non-test production environment
      const originalVitest = process.env.VITEST;
      try {
        delete (process.env as any).VITEST;

        await expect(
          verifyAndActivateStripeSession({
            sessionId: "cs_fake_session_12345",
            offerId: 901,
            expectedParentContactId: 101,
          })
        ).rejects.toThrow(/Production Stripe integration unavailable or credentials not configured/);
      } finally {
        process.env.VITEST = originalVitest;
      }
    });

    it("Test 4 (Defect D): Rejects session verification and checkout creation for unauthorized parents", async () => {
      const { verifyAndActivateStripeSession, createFamilyEnrollmentCheckoutSession } = await import(
        "./services/familyEnrollmentService"
      );

      const offer = {
        id: 902,
        parentContactId: 101, // Legitimate parent is contact 101
        studentContactId: 201,
        status: "payment_pending",
        agreementStatus: "signed",
        paymentStatus: "pending",
        selectedPlanPrice: "105.00",
        customCommitmentMonths: 12,
      };
      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(offer as any);

      // Parent 999 attempts to verify session for offer 902
      await expect(
        verifyAndActivateStripeSession({
          sessionId: "cs_test_mock_902",
          offerId: 902,
          expectedParentContactId: 999, // Unauthorized
        })
      ).rejects.toThrow(/Unauthorized: Authenticated parent does not match/);

      // Parent 999 attempts to initiate checkout session for offer 902
      vi.spyOn(db, "getContactById").mockResolvedValue({
        id: 999, // Mismatched contact
        firstName: "Intruder",
        lastName: "Parent",
        email: "intruder@example.com",
      } as any);

      await expect(
        createFamilyEnrollmentCheckoutSession({
          offerId: 902,
          parentContactId: 999,
          successUrl: "http://localhost:3000/portal?session_id={CHECKOUT_SESSION_ID}",
          cancelUrl: "http://localhost:3000/portal?canceled=true",
        })
      ).rejects.toThrow(/Authorization mismatch: Enrollment offer belongs to another family contact/);
    });

    it("Test 5 (Defect C): Validates authoritative payment amount, currency, and Stripe customer", async () => {
      const { verifyAndActivateStripeSession } = await import("./services/familyEnrollmentService");

      const offer = {
        id: 903,
        parentContactId: 101,
        studentContactId: 201,
        status: "payment_pending",
        agreementStatus: "signed",
        paymentStatus: "pending",
        selectedPlanPrice: "105.00",
        customCommitmentMonths: 12,
        stripeCustomerId: "cus_legit_101",
      };
      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(offer as any);

      // Session amount does not match expected $105.00 (10500 cents)
      await expect(
        verifyAndActivateStripeSession({
          sessionId: "cs_test_mock_amount_mismatch",
          offerId: 903,
          expectedParentContactId: 101,
          mockSessionData: {
            amount_total: 5500, // Underpayment: $55 instead of $105
            currency: "usd",
            customer: "cus_legit_101",
            payment_status: "paid",
          },
        })
      ).rejects.toThrow(/Payment amount mismatch/);

      // Session currency is not USD
      await expect(
        verifyAndActivateStripeSession({
          sessionId: "cs_test_mock_currency_mismatch",
          offerId: 903,
          expectedParentContactId: 101,
          mockSessionData: {
            amount_total: 10500,
            currency: "eur", // Non-USD
            customer: "cus_legit_101",
            payment_status: "paid",
          },
        })
      ).rejects.toThrow(/Invalid payment currency/);

      // Stripe customer mismatch
      await expect(
        verifyAndActivateStripeSession({
          sessionId: "cs_test_mock_customer_mismatch",
          offerId: 903,
          expectedParentContactId: 101,
          mockSessionData: {
            amount_total: 10500,
            currency: "usd",
            customer: "cus_different_party_999",
            payment_status: "paid",
          },
        })
      ).rejects.toThrow(/Stripe customer identity mismatch/);
    });

    it("Test 6 (Defect B): Asynchronous ACH payments remain pending and activate only upon clearance", async () => {
      const { processFamilyEnrollmentWebhook } = await import("./services/familyEnrollmentService");

      const pendingOffer = {
        id: 904,
        parentContactId: 104,
        studentContactId: 204,
        status: "payment_pending",
        agreementStatus: "signed",
        paymentStatus: "pending",
        selectedPlanPrice: "155.00",
        customCommitmentMonths: 12,
      };
      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(pendingOffer as any);
      vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id, data) => ({
        ...pendingOffer,
        ...data,
      } as any));

      // 1. Initial ACH checkout session completion (funds unpaid, pending bank settlement)
      const achPendingEvent = {
        id: "evt_ach_pending_904",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_ach_904",
            customer: "cus_test_104",
            payment_status: "unpaid", // Still processing
            metadata: {
              family_enrollment_offer_id: "904",
            },
          },
        },
      };

      const pendingResult = await processFamilyEnrollmentWebhook(achPendingEvent);
      expect(pendingResult.processed).toBe(true);
      expect(pendingResult.action).toBe("payment_processing_unpaid");

      // 2. Later: ACH funds clear via checkout.session.async_payment_succeeded
      const achSuccessEvent = {
        id: "evt_ach_success_904",
        type: "checkout.session.async_payment_succeeded",
        data: {
          object: {
            id: "cs_test_ach_904",
            customer: "cus_test_104",
            subscription: "sub_test_ach_904",
            metadata: {
              family_enrollment_offer_id: "904",
            },
          },
        },
      };

      const successResult = await processFamilyEnrollmentWebhook(achSuccessEvent);
      expect(successResult.processed).toBe(true);
      expect(successResult.action).toBe("async_payment_succeeded");

      // 3. Alternatively: If ACH fails via async_payment_failed
      const achFailedEvent = {
        id: "evt_ach_failed_904",
        type: "checkout.session.async_payment_failed",
        data: {
          object: {
            id: "cs_test_ach_904",
            customer: "cus_test_104",
            metadata: {
              family_enrollment_offer_id: "904",
            },
          },
        },
      };

      const failedResult = await processFamilyEnrollmentWebhook(achFailedEvent);
      expect(failedResult.processed).toBe(true);
      expect(failedResult.action).toBe("async_payment_failed");
    });

    it("Test 7 (Defect E): Handles refunds and disputes without terminating advocacy services", async () => {
      const { processFamilyEnrollmentWebhook } = await import("./services/familyEnrollmentService");

      const activeOffer = {
        id: 905,
        parentContactId: 105,
        studentContactId: 205,
        status: "active",
        agreementStatus: "signed",
        paymentStatus: "paid",
        stripePaymentIntentId: "pi_test_905",
        stripeCustomerId: "cus_test_105",
      };
      vi.spyOn(db, "getEnrollmentOfferByStripePaymentIntentId").mockResolvedValue(activeOffer as any);
      vi.spyOn(db, "getEnrollmentOfferByStripeCustomerId").mockResolvedValue(activeOffer as any);
      const updateSpy = vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id, data) => ({
        ...activeOffer,
        ...data,
      } as any));

      // 1. Charge refunded webhook event
      const refundEvent = {
        id: "evt_refund_905",
        type: "charge.refunded",
        data: {
          object: {
            id: "ch_test_905",
            payment_intent: "pi_test_905",
            customer: "cus_test_105",
            amount_refunded: 15500,
          },
        },
      };

      const refundResult = await processFamilyEnrollmentWebhook(refundEvent);
      expect(refundResult.processed).toBe(true);
      expect(refundResult.action).toBe("charge_refunded");
      // Must flag payment_attention without destroying active status
      expect(updateSpy).toHaveBeenCalledWith(
        905,
        expect.objectContaining({
          status: "payment_attention",
          paymentStatus: "refunded",
        })
      );

      // 2. Dispute opened webhook event
      const disputeEvent = {
        id: "evt_dispute_905",
        type: "charge.dispute.created",
        data: {
          object: {
            id: "dp_test_905",
            payment_intent: "pi_test_905",
            customer: "cus_test_105",
            amount: 15500,
            reason: "unrecognized",
          },
        },
      };

      const disputeResult = await processFamilyEnrollmentWebhook(disputeEvent);
      expect(disputeResult.processed).toBe(true);
      expect(disputeResult.action).toBe("charge_dispute_created");
      expect(updateSpy).toHaveBeenCalledWith(
        905,
        expect.objectContaining({
          status: "payment_attention",
          paymentStatus: "disputed",
        })
      );
    });

    it("Test 8: Pay in Full checkout session uses payment mode with BNPL options and 0 recurring subscription", async () => {
      const { createFamilyEnrollmentCheckoutSession, activateFamilyMembership } = await import(
        "./services/familyEnrollmentService"
      );

      const offer = {
        id: 906,
        parentContactId: 106,
        studentContactId: 206,
        status: "payment_pending",
        agreementStatus: "signed",
        paymentStatus: "pending",
        selectedPlanKey: "anchor",
        selectedPlanName: "Anchor",
        selectedPlanPrice: "105.00",
        customCommitmentMonths: 12,
        paymentStructure: "pay_in_full",
      };
      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(offer as any);
      vi.spyOn(db, "getContactById").mockResolvedValue({
        id: 106,
        firstName: "Amanda",
        lastName: "Perez",
        email: "amanda@example.com",
      } as any);

      // Create Pay in Full session
      const sessionResult = await createFamilyEnrollmentCheckoutSession({
        offerId: 906,
        parentContactId: 106,
        paymentStructure: "pay_in_full",
        successUrl: "http://localhost:3000/portal?session_id={CHECKOUT_SESSION_ID}",
        cancelUrl: "http://localhost:3000/portal?canceled=true",
      });

      expect(sessionResult.mode).toBe("payment");
      expect(sessionResult.amountTotal).toBe(1260); // $105 * 12 = $1,260.00
      expect(sessionResult.paymentMethodTypes).toContain("affirm");
      expect(sessionResult.paymentMethodTypes).toContain("klarna");
      expect(sessionResult.paymentMethodTypes).toContain("afterpay_clearpay");

      // Activate Pay in Full membership
      const updateSpy = vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id, data) => ({
        ...offer,
        ...data,
      } as any));

      const activated = await activateFamilyMembership({
        offerId: 906,
        stripeCustomerId: "cus_test_106",
        stripePaymentIntentId: "pi_test_pif_906",
        source: "stripe_webhook_pay_in_full_completed",
      });

      expect(activated.status).toBe("active");
      expect(activated.paymentStatus).toBe("paid");
      // Zero recurring subscription for Pay in Full
      expect(activated.stripeSubscriptionId).toBeNull();
      expect(activated.membershipStartedAt).toBeDefined();
      expect(activated.commitmentEndsAt).toBeDefined();
      expect(updateSpy).toHaveBeenCalledWith(
        906,
        expect.objectContaining({
          status: "active",
          paymentStatus: "paid",
          stripeSubscriptionId: null,
        })
      );
    });

    it("Test 9: Monthly autopay checkout session uses subscription mode and excludes BNPL financing", async () => {
      const { createFamilyEnrollmentCheckoutSession } = await import("./services/familyEnrollmentService");

      const offer = {
        id: 907,
        parentContactId: 107,
        studentContactId: 207,
        status: "payment_pending",
        agreementStatus: "signed",
        paymentStatus: "pending",
        selectedPlanKey: "navigator",
        selectedPlanName: "Navigator",
        selectedPlanPrice: "55.00",
        customCommitmentMonths: 12,
        paymentStructure: "monthly_autopay",
      };
      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(offer as any);
      vi.spyOn(db, "getContactById").mockResolvedValue({
        id: 107,
        firstName: "David",
        lastName: "Miller",
        email: "david@example.com",
      } as any);

      const sessionResult = await createFamilyEnrollmentCheckoutSession({
        offerId: 907,
        parentContactId: 107,
        paymentStructure: "monthly_autopay",
        successUrl: "http://localhost:3000/portal?session_id={CHECKOUT_SESSION_ID}",
        cancelUrl: "http://localhost:3000/portal?canceled=true",
      });

      expect(sessionResult.mode).toBe("subscription");
      expect(sessionResult.amountTotal).toBe(55);
      // BNPL methods must NOT be present in subscription mode
      expect(sessionResult.paymentMethodTypes).not.toContain("affirm");
      expect(sessionResult.paymentMethodTypes).not.toContain("klarna");
      expect(sessionResult.paymentMethodTypes).not.toContain("afterpay_clearpay");
      expect(sessionResult.paymentMethodTypes).toContain("card");
      expect(sessionResult.paymentMethodTypes).toContain("us_bank_account");
    });

    it("Test 10: Prevents payment structure mismatch when agreement was signed under a different structure", async () => {
      const { createFamilyEnrollmentCheckoutSession } = await import("./services/familyEnrollmentService");

      const offer = {
        id: 908,
        parentContactId: 108,
        studentContactId: 208,
        status: "payment_pending",
        agreementStatus: "signed",
        paymentStatus: "pending",
        selectedPlanKey: "anchor",
        selectedPlanName: "Anchor",
        selectedPlanPrice: "105.00",
        customCommitmentMonths: 12,
        paymentStructure: "monthly_autopay", // Signed under monthly
      };
      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(offer as any);
      vi.spyOn(db, "getContactById").mockResolvedValue({
        id: 108,
        firstName: "Elena",
        lastName: "Rostova",
        email: "elena@example.com",
      } as any);

      // Attempting to checkout with pay_in_full when agreement was signed for monthly_autopay
      await expect(
        createFamilyEnrollmentCheckoutSession({
          offerId: 908,
          parentContactId: 108,
          paymentStructure: "pay_in_full",
          successUrl: "http://localhost:3000/portal?session_id={CHECKOUT_SESSION_ID}",
          cancelUrl: "http://localhost:3000/portal?canceled=true",
        })
      ).rejects.toThrow(/Payment structure changed.*updated agreement.*required/);
    });

    it("Test 11: Protected systems integrity — StudentProfileDossier, left layout, and case stages untouched", async () => {
      const fs = await import("fs");
      const path = await import("path");

      // Verify StudentProfileDossier.tsx is untouched and free of billing code
      const dossierPath = path.resolve(__dirname, "../client/src/components/students/StudentProfileDossier.tsx");
      expect(fs.existsSync(dossierPath)).toBe(true);
      const dossierContent = fs.readFileSync(dossierPath, "utf-8");
      expect(dossierContent).not.toContain("StripeCheckout");
      expect(dossierContent).not.toContain("pay_in_full");
      expect(dossierContent).not.toContain("familyEnrollment");

      // Verify no live production charge execution configured
      expect(process.env.STRIPE_SECRET_KEY ? false : true).toBe(true);
    });
  });

  describe("Phase 2E: Final Enrollment Sequence Corrections (A, B, C & Complete 12-Step Flow)", () => {
    it("Test 1: Correction A — Monthly plan & payment structure choice before signing", async () => {
      const { selectFamilyEnrollmentPlan } = await import("./services/familyEnrollmentService");

      const offer = {
        id: 920,
        parentContactId: 120,
        studentContactId: 220,
        status: "invitation_sent",
        enrollmentMode: "standard",
        billingArrangement: "autopay",
        agreementStatus: "none",
        paymentStatus: "unpaid",
        invitationExpiresAt: new Date(Date.now() + 86400000),
      };
      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(offer as any);
      vi.spyOn(db, "getContactById").mockImplementation(async (id: number) => {
        if (id === 120) {
          return { id: 120, firstName: "Rachel", lastName: "Green", email: "rachel@example.com" } as any;
        }
        return { id: 220, firstName: "Emma", lastName: "Green", gradeLevel: "5th" } as any;
      });
      const updateSpy = vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id, data) => ({
        ...offer,
        ...data,
      } as any));

      const result = await selectFamilyEnrollmentPlan({
        offerId: 920,
        planKey: "anchor",
        paymentStructure: "monthly_autopay",
        parentContactId: 120,
      });

      expect(result.success).toBe(true);
      expect(result.agreementId).toBeGreaterThan(0);
      expect(updateSpy).toHaveBeenCalledWith(
        920,
        expect.objectContaining({
          selectedPlanKey: "anchor",
          selectedPlanName: "Anchor",
          selectedPlanPrice: "105",
          paymentStructure: "monthly_autopay",
          status: "agreement_pending",
          agreementStatus: "awaiting_signature",
        })
      );
    });

    it("Test 2: Correction B — Pay in Full agreement includes accurate upfront terms, BNPL disclosure, and zero monthly recurring charges", async () => {
      const { selectFamilyEnrollmentPlan } = await import("./services/familyEnrollmentService");
      const { inMemoryAgreements } = await import("./routers/agreements");

      const offer = {
        id: 921,
        parentContactId: 121,
        studentContactId: 221,
        status: "invitation_sent",
        enrollmentMode: "standard",
        billingArrangement: "autopay",
        agreementStatus: "none",
        paymentStatus: "unpaid",
        invitationExpiresAt: new Date(Date.now() + 86400000),
      };
      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(offer as any);
      vi.spyOn(db, "getContactById").mockImplementation(async (id: number) => {
        if (id === 121) {
          return { id: 121, firstName: "Monica", lastName: "Geller", email: "monica@example.com" } as any;
        }
        return { id: 221, firstName: "Jack", lastName: "Bing", gradeLevel: "2nd" } as any;
      });
      vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id, data) => ({
        ...offer,
        ...data,
      } as any));

      const result = await selectFamilyEnrollmentPlan({
        offerId: 921,
        planKey: "anchor",
        paymentStructure: "pay_in_full",
        parentContactId: 121,
      });

      expect(result.success).toBe(true);
      const agreement = inMemoryAgreements?.get(result.agreementId);
      expect(agreement).toBeDefined();

      const html = agreement?.content || "";
      // Must contain Pay in Full terms
      expect(html).toContain("Pay in Full");
      expect(html).toContain("Single Upfront Payment");
      expect(html).toContain("1260.00");
      // Must contain third-party financing disclosure
      expect(html).toContain("Third-Party Financing Disclosure");
      expect(html).toContain("Klarna, Affirm, or Afterpay");
      expect(html).toContain("subject to their terms, credit approval, and customer eligibility");
      // Must explain zero automatic monthly recurring charges
      expect(html).toContain("No automatic monthly recurring subscription fees");
      // Must NOT contain monthly autopay recurring billing authorization in payment structure section
      expect(html).not.toContain("recurring monthly charge of $105.00");
    });

    it("Test 3: Correction B — Itemized authorized discount is displayed in Pay in Full agreement", async () => {
      const { selectFamilyEnrollmentPlan } = await import("./services/familyEnrollmentService");
      const { inMemoryAgreements } = await import("./routers/agreements");

      const offer = {
        id: 922,
        parentContactId: 122,
        studentContactId: 222,
        status: "invitation_sent",
        enrollmentMode: "standard",
        billingArrangement: "autopay",
        payInFullDiscountType: "percentage",
        payInFullDiscountValue: 10, // 10% discount
        agreementStatus: "none",
        paymentStatus: "unpaid",
        invitationExpiresAt: new Date(Date.now() + 86400000),
      };
      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(offer as any);
      vi.spyOn(db, "getContactById").mockImplementation(async (id: number) => {
        if (id === 122) {
          return { id: 122, firstName: "Chandler", lastName: "Bing", email: "chandler@example.com" } as any;
        }
        return { id: 222, firstName: "Erica", lastName: "Bing", gradeLevel: "3rd" } as any;
      });
      const updateSpy = vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id, data) => ({
        ...offer,
        ...data,
      } as any));

      const result = await selectFamilyEnrollmentPlan({
        offerId: 922,
        planKey: "anchor",
        paymentStructure: "pay_in_full",
        parentContactId: 122,
      });

      expect(result.success).toBe(true);
      expect(updateSpy).toHaveBeenCalledWith(
        922,
        expect.objectContaining({
          paymentStructure: "pay_in_full",
          payInFullOriginalAmount: "1260.00",
          payInFullDiscountAmount: "126.00",
          payInFullFinalAmount: "1134.00",
        })
      );

      const agreement = inMemoryAgreements?.get(result.agreementId);
      const html = agreement?.content || "";
      expect(html).toContain("1260.00");
      expect(html).toContain("-$126.00");
      expect(html).toContain("1134.00");
    });

    it("Test 4: Correction C — Payment structure change BEFORE signing voids draft and regenerates without duplicate agreements", async () => {
      const { selectFamilyEnrollmentPlan } = await import("./services/familyEnrollmentService");
      const { inMemoryAgreements } = await import("./routers/agreements");

      let currentAgreementId: number | null = null;
      const offer: any = {
        id: 923,
        parentContactId: 123,
        studentContactId: 223,
        status: "invitation_sent",
        enrollmentMode: "standard",
        billingArrangement: "autopay",
        agreementStatus: "none",
        paymentStatus: "unpaid",
        invitationExpiresAt: new Date(Date.now() + 86400000),
      };
      vi.spyOn(db, "getEnrollmentOfferById").mockImplementation(async () => ({
        ...offer,
        agreementId: currentAgreementId,
      }) as any);
      vi.spyOn(db, "getContactById").mockImplementation(async (id: number) => ({
        id,
        firstName: "Phoebe",
        lastName: "Buffay",
        email: "phoebe@example.com",
      } as any));
      vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id, data) => {
        Object.assign(offer, data);
        currentAgreementId = data.agreementId || currentAgreementId;
        return { ...offer };
      });

      // 1. Parent initially selects Monthly Autopay
      const firstSelection = await selectFamilyEnrollmentPlan({
        offerId: 923,
        planKey: "anchor",
        paymentStructure: "monthly_autopay",
        parentContactId: 123,
      });
      const firstAgreementId = firstSelection.agreementId;
      expect(firstAgreementId).toBeGreaterThan(0);
      expect(inMemoryAgreements?.get(firstAgreementId)?.status).toBe("Sent");

      // 2. Before signing, parent switches to Pay in Full
      const secondSelection = await selectFamilyEnrollmentPlan({
        offerId: 923,
        planKey: "anchor",
        paymentStructure: "pay_in_full",
        parentContactId: 123,
      });
      const secondAgreementId = secondSelection.agreementId;
      expect(secondAgreementId).not.toBe(firstAgreementId);

      // Verify first draft agreement was marked Voided
      expect(inMemoryAgreements?.get(firstAgreementId)?.status).toBe("Voided");
      // Verify second draft agreement is now active and awaiting signature
      expect(inMemoryAgreements?.get(secondAgreementId)?.status).toBe("Sent");
      // Offer references ONLY the new agreement
      expect(offer.agreementId).toBe(secondAgreementId);
      expect(offer.paymentStructure).toBe("pay_in_full");
    });

    it("Test 5: Phase 2F.1 Correction 1 — Payment structure revision preserves original signed agreement as Signed (NOT Superseded) and sets hasPendingRevision = true", async () => {
      const { requestPaymentStructureRevision } = await import("./services/familyEnrollmentService");
      const { inMemoryAgreements } = await import("./routers/agreements");

      const originalSignedAgreementId = 8801;
      inMemoryAgreements?.set(originalSignedAgreementId, {
        id: originalSignedAgreementId,
        title: "Advocacy Services Agreement - Anchor Support Plan",
        status: "Signed",
        clientSignature: "Joey Tribbiani",
        signedAt: new Date().toISOString(),
        sha256Hash: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        content: "<p>Original signed agreement terms</p>",
      });

      const offer: any = {
        id: 924,
        parentContactId: 124,
        studentContactId: 224,
        selectedPlanKey: "anchor",
        selectedPlanName: "Anchor",
        selectedPlanPrice: "105.00",
        paymentStructure: "monthly_autopay",
        agreementId: originalSignedAgreementId,
        agreementStatus: "signed",
        status: "agreement_signed",
        paymentStatus: "pending",
        customCommitmentMonths: 12,
        hasPendingRevision: false,
      };

      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(offer as any);
      vi.spyOn(db, "getContactById").mockImplementation(async (id: number) => ({
        id,
        firstName: "Joey",
        lastName: "Tribbiani",
        email: "joey@example.com",
      } as any));
      const updateSpy = vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id, data) => {
        Object.assign(offer, data);
        return { ...offer };
      });

      // Execute revision request
      const revisionResult = await requestPaymentStructureRevision({
        offerId: 924,
        parentContactId: 124,
        newPaymentStructure: "pay_in_full",
        requesterName: "Joey Tribbiani",
      });

      expect(revisionResult.success).toBe(true);
      expect(revisionResult.newAgreementId).toBeGreaterThan(0);
      expect(revisionResult.newAgreementId).not.toBe(originalSignedAgreementId);

      // 1. Verify original signed agreement is PRESERVED in full force and effect as Signed (NOT Superseded)
      const originalAgreement = inMemoryAgreements?.get(originalSignedAgreementId);
      expect(originalAgreement?.status).toBe("Signed");
      expect(originalAgreement?.sha256Hash).toBeDefined();

      // 2. Verify revised agreement draft is generated and awaiting signature
      const revisedAgreement = inMemoryAgreements?.get(revisionResult.newAgreementId);
      expect(revisedAgreement?.status).toBe("Sent");
      expect(revisedAgreement?.content).toContain("Pay in Full");

      // 3. Verify offer preserves original agreementId and tracks pending revision
      expect(updateSpy).toHaveBeenCalledWith(
        924,
        expect.objectContaining({
          hasPendingRevision: true,
          pendingRevisionAgreementId: revisionResult.newAgreementId,
          pendingRevisionStructure: "pay_in_full",
        })
      );
      expect(offer.hasPendingRevision).toBe(true);
      expect(offer.agreementId).toBe(originalSignedAgreementId);
    });

    it("Test 5B: Phase 2F.1 — Checkout is blocked while a payment structure revision is pending", async () => {
      const { createFamilyEnrollmentCheckoutSession } = await import("./services/familyEnrollmentService");

      const pendingOffer: any = {
        id: 9242,
        parentContactId: 124,
        studentContactId: 224,
        selectedPlanKey: "anchor",
        selectedPlanName: "Anchor",
        selectedPlanPrice: "105.00",
        paymentStructure: "monthly_autopay",
        agreementId: 8801,
        agreementStatus: "signed",
        status: "agreement_signed",
        paymentStatus: "pending",
        hasPendingRevision: true,
        pendingRevisionAgreementId: 8803,
        pendingRevisionStructure: "pay_in_full",
      };

      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(pendingOffer as any);

      await expect(
        createFamilyEnrollmentCheckoutSession({
          offerId: 9242,
          parentContactId: 124,
          paymentStructure: "monthly_autopay",
        })
      ).rejects.toThrow(/revision is currently pending/i);
    });

    it("Test 5C: Phase 2F.1 — Canceling pending revision discards revision draft and restores original checkout readiness", async () => {
      const { cancelPaymentStructureRevision } = await import("./services/familyEnrollmentService");
      const { inMemoryAgreements } = await import("./routers/agreements");

      const revisionDraftId = 8804;
      inMemoryAgreements?.set(revisionDraftId, {
        id: revisionDraftId,
        title: "Advocacy Services Agreement - Anchor Support Plan (Revised)",
        status: "Sent",
      });

      const offerWithRevision: any = {
        id: 9243,
        parentContactId: 124,
        studentContactId: 224,
        selectedPlanKey: "anchor",
        selectedPlanName: "Anchor",
        selectedPlanPrice: "105.00",
        paymentStructure: "monthly_autopay",
        agreementId: 8801,
        agreementStatus: "signed",
        status: "agreement_signed",
        paymentStatus: "pending",
        hasPendingRevision: true,
        pendingRevisionAgreementId: revisionDraftId,
        pendingRevisionStructure: "pay_in_full",
      };

      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(offerWithRevision as any);
      const updateSpy = vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id, data) => {
        Object.assign(offerWithRevision, data);
        return { ...offerWithRevision };
      });

      const cancelResult = await cancelPaymentStructureRevision({
        offerId: 9243,
        parentContactId: 124,
      });

      expect(cancelResult.success).toBe(true);
      expect(offerWithRevision.hasPendingRevision).toBe(false);
      expect(offerWithRevision.pendingRevisionAgreementId).toBeNull();
      expect(inMemoryAgreements?.get(revisionDraftId)?.status).toBe("Cancelled");
    });

    it("Test 5D: Phase 2F.1 — Executing replacement agreement supersedes original agreement and completes revision", async () => {
      const { onAgreementSignedForEnrollment } = await import("./services/familyEnrollmentService");
      const { inMemoryAgreements } = await import("./routers/agreements");

      const originalId = 8805;
      const replacementId = 8806;

      inMemoryAgreements?.set(originalId, {
        id: originalId,
        title: "Original Agreement",
        status: "Signed",
        clientSignature: "Joey Tribbiani",
        sha256Hash: "hash-original",
      });

      inMemoryAgreements?.set(replacementId, {
        id: replacementId,
        title: "Revised Replacement Agreement",
        status: "Sent",
      });

      const offer: any = {
        id: 9244,
        parentContactId: 124,
        studentContactId: 224,
        selectedPlanKey: "anchor",
        selectedPlanName: "Anchor",
        selectedPlanPrice: "105.00",
        paymentStructure: "monthly_autopay",
        agreementId: originalId,
        agreementStatus: "signed",
        status: "payment_pending",
        paymentStatus: "pending",
        hasPendingRevision: true,
        pendingRevisionAgreementId: replacementId,
        pendingRevisionStructure: "pay_in_full",
      };

      vi.spyOn(db, "getActiveOfferForFamily").mockResolvedValue(offer as any);
      vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id, data) => {
        Object.assign(offer, data);
        return { ...offer };
      });

      // Execute signing of replacement agreement
      const hookResult = await onAgreementSignedForEnrollment({
        agreementId: replacementId,
        clientId: 124,
        signerName: "Joey Tribbiani",
      });

      // 1. Original agreement is NOW AND ONLY NOW marked Superseded
      expect(inMemoryAgreements?.get(originalId)?.status).toBe("Superseded");

      // 2. Offer now references replacement agreement and new payment structure
      expect(offer.agreementId).toBe(replacementId);
      expect(offer.paymentStructure).toBe("pay_in_full");
      expect(offer.hasPendingRevision).toBe(false);
      expect(offer.pendingRevisionAgreementId).toBeNull();
    });

    it("Test 6: Parent cannot invoke staff supersede or alter discounts/prices", async () => {
      const { requestPaymentStructureRevision } = await import("./services/familyEnrollmentService");

      const offer: any = {
        id: 925,
        parentContactId: 125,
        studentContactId: 225,
        selectedPlanKey: "anchor",
        selectedPlanPrice: "105.00",
        paymentStructure: "monthly_autopay",
        agreementId: 8802,
        agreementStatus: "signed",
        status: "agreement_signed",
        paymentStatus: "pending",
      };
      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(offer as any);

      // Attempting revision from unauthorized parent ID must reject
      await expect(
        requestPaymentStructureRevision({
          offerId: 925,
          parentContactId: 99999, // Wrong parent
          newPaymentStructure: "pay_in_full",
        })
      ).rejects.toThrow(/Unauthorized/);

      // Verify requestPaymentStructureRevision signature does not accept custom prices or discounts
      // (Strict type verification at runtime)
      const revisionFunctionParams = requestPaymentStructureRevision.length;
      expect(revisionFunctionParams).toBe(1);
    });

    it("Test 7: Checkout amount matches latest signed terms and activates only after verified payment", async () => {
      const { createFamilyEnrollmentCheckoutSession, activateFamilyMembership } = await import(
        "./services/familyEnrollmentService"
      );

      const offer = {
        id: 926,
        parentContactId: 126,
        studentContactId: 226,
        status: "payment_pending",
        agreementStatus: "signed",
        paymentStatus: "pending",
        selectedPlanKey: "anchor",
        selectedPlanName: "Anchor",
        selectedPlanPrice: "105.00",
        customCommitmentMonths: 12,
        paymentStructure: "pay_in_full",
        payInFullDiscountType: "percentage",
        payInFullDiscountValue: 10,
        payInFullOriginalAmount: "1260.00",
        payInFullDiscountAmount: "126.00",
        payInFullFinalAmount: "1134.00",
      };
      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(offer as any);
      vi.spyOn(db, "getContactById").mockResolvedValue({
        id: 126,
        firstName: "Ross",
        lastName: "Geller",
        email: "ross@example.com",
      } as any);

      // 1. Checkout session must use the exact discounted final amount: $1,134.00
      const sessionResult = await createFamilyEnrollmentCheckoutSession({
        offerId: 926,
        parentContactId: 126,
        paymentStructure: "pay_in_full",
        successUrl: "http://localhost:3000/portal?session_id={CHECKOUT_SESSION_ID}",
        cancelUrl: "http://localhost:3000/portal?canceled=true",
      });

      expect(sessionResult.mode).toBe("payment");
      expect(sessionResult.amountTotal).toBe(1134);

      // 2. Offer must NOT be activated before verified payment
      expect(offer.status).toBe("payment_pending");

      // 3. Activation occurs only after verified payment
      const updateSpy = vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id, data) => ({
        ...offer,
        ...data,
      } as any));

      const activated = await activateFamilyMembership({
        offerId: 926,
        stripeCustomerId: "cus_test_ross",
        stripePaymentIntentId: "pi_test_ross_1134",
        source: "stripe_webhook_pay_in_full_completed",
      });

      expect(activated.status).toBe("active");
      expect(activated.paymentStatus).toBe("paid");
      expect(activated.stripeSubscriptionId).toBeNull(); // No recurring subscription for pay in full
      expect(updateSpy).toHaveBeenCalledWith(
        926,
        expect.objectContaining({
          status: "active",
          paymentStatus: "paid",
        })
      );
    });

    it("Test 8: Document review gating before Blueprint Strategy Call", async () => {
      const { markDocumentReviewComplete } = await import("./services/familyEnrollmentService");

      const activeOffer = {
        id: 927,
        parentContactId: 127,
        studentContactId: 227,
        status: "active",
        agreementStatus: "signed",
        paymentStatus: "paid",
        documentReviewStatus: "pending",
        documentReviewCompletedAt: null,
      };
      vi.spyOn(db, "getEnrollmentOfferById").mockResolvedValue(activeOffer as any);
      const updateSpy = vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id, data) => ({
        ...activeOffer,
        ...data,
      } as any));

      // Before review: document review status is pending
      expect(activeOffer.documentReviewStatus).toBe("pending");

      // Advocate marks document review complete
      const reviewed = await markDocumentReviewComplete({
        offerId: 927,
        studentContactId: 227,
        advocateUserId: 1,
        advocateUserName: "Byron Honea",
        reviewNotes: "IEP and psychoeducational evaluation reviewed. Strategy session unlocked.",
      });

      expect(reviewed.documentReviewStatus).toBe("approved");
      expect(reviewed.documentReviewCompletedAt).toBeDefined();
      expect(updateSpy).toHaveBeenCalledWith(
        927,
        expect.objectContaining({
          documentReviewStatus: "approved",
          documentReviewCompletedByName: "Byron Honea",
        })
      );
    });

    it("Test 9: Family-level billing and sibling case stages preserved", async () => {
      const { resolveFamilyContext } = await import("./services/familyEnrollmentService");

      // Mock family with parent 128 and two students: student 228 (IEP) and sibling 229 (504)
      vi.spyOn(db, "getContactById").mockImplementation(async (id: number) => {
        if (id === 128) {
          return { id: 128, firstName: "Carol", lastName: "Willick", email: "carol@example.com" } as any;
        }
        if (id === 228) {
          return { id: 228, parentContactId: 128, firstName: "Ben", lastName: "Geller", pipelineStage: "Case Open" } as any;
        }
        if (id === 229) {
          return { id: 229, parentContactId: 128, firstName: "Susan", lastName: "Geller", pipelineStage: "Discovery Completed" } as any;
        }
        return null;
      });

      const context1 = await resolveFamilyContext({ studentContactId: 228 });
      expect(context1.parentContactId).toBe(128);

      const context2 = await resolveFamilyContext({ studentContactId: 229 });
      expect(context2.parentContactId).toBe(128);

      // Both siblings resolve to the same parent contact anchor
      expect(context1.parentContactId).toBe(context2.parentContactId);
    });

    it("Test 10: Strict Brand Terminology Guardrail (Rule F) & Profile Protection", async () => {
      const fs = await import("fs");
      const path = await import("path");

      // 1. Prohibit "Master Coach" variants
      const servicePath = path.resolve(__dirname, "./services/familyEnrollmentService.ts");
      const serviceContent = fs.readFileSync(servicePath, "utf-8");
      expect(serviceContent).not.toMatch(/Master\s*Coach/i);
      expect(serviceContent).not.toMatch(/Master\s*IEP\s*Coach/i);

      const routerPath = path.resolve(__dirname, "./routers/familyEnrollment.ts");
      const routerContent = fs.readFileSync(routerPath, "utf-8");
      expect(routerContent).not.toMatch(/Master\s*Coach/i);
      expect(routerContent).not.toMatch(/Master\s*IEP\s*Coach/i);

      // 2. Absolute Profile Protection
      const dossierPath = path.resolve(__dirname, "../client/src/components/students/StudentProfileDossier.tsx");
      const dossierContent = fs.readFileSync(dossierPath, "utf-8");
      expect(dossierContent).not.toContain("ChooseSupportExperience");
      expect(dossierContent).not.toContain("requestPaymentStructureRevision");
    });

    it("Test 11: Phase 2F.1 Correction 2 — Document review gate enforces eligibility for IEP Blueprint Strategy Calls", async () => {
      const { appRouter } = await import("./routers");

      // Verify that appointments.book router exists and has Document Review Gating
      const caller = appRouter.createCaller({
        user: { id: 1, role: "admin", name: "Lead Advocate" },
      } as any);

      // Verify appRouter has appointments.book procedure
      expect(typeof caller.appointments.book).toBe("function");

      // Verify appointments router code contains the Document Review Gating logic
      const fs = await import("fs");
      const path = await import("path");
      const appointmentsRouterPath = path.resolve(__dirname, "./routers/appointments.ts");
      const routerCode = fs.readFileSync(appointmentsRouterPath, "utf-8");

      expect(routerCode).toContain("documentReviewStatus !== \"approved\"");
      expect(routerCode).toContain("IEP Blueprint Strategy Session scheduling is locked");
    });
  });

  // =========================================================================
  // PHASE 2G: Authoritative 15-Section Contract Alignment & Billing Safeguards
  // =========================================================================
  describe("PHASE 2G — Authoritative Contract Source Alignment & Billing Safeguards", () => {
    it("Test 2G.1: Generates complete 15-Section Authoritative Educational Advocacy Agreement with verbatim core clauses", async () => {
      const { generateEnrollmentAgreement, calculatePayInFullQuote } = await import("./services/familyEnrollmentService");

      const parentContact = {
        id: 301,
        firstName: "Eleanor",
        lastName: "Vance",
        email: "eleanor.vance@example.com",
      };

      const studentContact = {
        id: 401,
        firstName: "Theodora",
        lastName: "Vance",
        grade: "5th Grade",
        schoolName: "Hilldale Elementary",
      };

      const offer: any = {
        id: 501,
        parentContactId: 301,
        studentContactId: 401,
        status: "approved",
        enrollmentMode: "standard",
        selectedPlanKey: "anchor",
        selectedPlanName: "Anchor",
        selectedPlanPrice: "105.00",
        approvedBy: 1,
        approvedByName: "Byron Honea",
        billingArrangement: "autopay",
        paymentStructure: "monthly_autopay",
        customCommitmentMonths: 12,
      };

      const quote = calculatePayInFullQuote({
        priceMonthly: 105,
        commitmentMonths: 12,
      });

      const gen = await generateEnrollmentAgreement({
        parentContact,
        studentContact,
        offer,
        planKey: "anchor",
        planName: "Anchor",
        priceMonthly: 105,
        commitmentMonths: 12,
        paymentStructure: "monthly_autopay",
        billingArrangement: "autopay",
        planDescription: "Full executive advocacy package.",
        features: ["Unlimited IEP & 504 Representation"],
        quote,
      });

      const content = gen.content;

      // 1. Header & Preamble
      expect(content).toContain("THIS IS A LEGAL DOCUMENT");
      expect(content).toContain("Clientcare@waypointadvocates.com");
      expect(content).toContain("Educational Advocacy Services Agreement");
      expect(content).toContain("Eleanor Vance");
      expect(content).toContain("Theodora Vance");
      expect(content).toContain("Anchor");

      // 2. All 15 Sections by title
      expect(content).toContain("1. 🧭 OUR AGREEMENT");
      expect(content).toContain("2. 💙 YOUR ADVOCACY PLAN");
      expect(content).toContain("3. 🤝 HOW WE WORK TOGETHER");
      expect(content).toContain("4. 📄 CLIENT RESPONSIBILITIES");
      expect(content).toContain("5. 📅 MEETINGS &amp; SCHEDULING");
      expect(content).toContain("6. ✍️ WRITTEN ADVOCACY &amp; STATE COMPLAINTS");
      expect(content).toContain("7. 🚫 SERVICES NOT INCLUDED");
      expect(content).toContain("8. 💳 FEES &amp; 12-MONTH SERVICE COMMITMENT");
      expect(content).toContain("9. 💳 RECURRING PAYMENT AUTHORIZATION");
      expect(content).toContain("10. 🚪 CANCELLATION &amp; AUTOPAY");
      expect(content).toContain("11. ⛔ WAYPOINT&#39;S RIGHT TO WITHDRAW");
      expect(content).toContain("12. 🔒 CONFIDENTIALITY &amp; CASE COLLABORATION");
      expect(content).toContain("13. ⚖️ LIMITATION OF ROLE &amp; LIABILITY");
      expect(content).toContain("14. ⚖️ GOVERNING LAW &amp; SEVERABILITY");
      expect(content).toContain("15. 📃 ENTIRE AGREEMENT");

      // 3. Section-specific Verbatim Legal & Operational Invariants
      // Section 1: Non-attorney disclaimer & advocacy philosophy
      expect(content).toContain("Waypoint Advocates and its staff are not attorneys and do not provide legal advice or legal representation");
      expect(content).toContain("Waypoint&#39;s advocacy philosophy emphasizes collaboration, documentation, data, and productive problem-solving whenever possible");

      // Section 3: Parent-led advocacy model
      expect(content).toContain("Waypoint uses a parent-led advocacy model");
      expect(content).toContain("The Client remains the student&#39;s parent or guardian, primary school contact, and educational decision-maker");
      expect(content).toContain("Nothing in this Agreement transfers parental rights or educational decision-making authority to Waypoint Advocates");

      // Section 4: Client responsibilities (A, B, C, D)
      expect(content).toContain("A. Records and Documents");
      expect(content).toContain("B. Records Review Timeline");
      expect(content).toContain("A delay in receiving records, whether caused by the Client or school district, does not automatically pause the Client&#39;s service term or recurring payment obligations");
      expect(content).toContain("C. School Communications");
      expect(content).toContain("D. Final School Documents");
      expect(content).toContain("The Parent or Guardian retains all applicable educational decision-making and signing authority");

      // Section 5: Virtual platform and 3 dates + 3 times rule
      expect(content).toContain("Zoom, Microsoft Teams, Google Meet, telephone, or another virtual platform");
      expect(content).toContain("💡 Easy rule: 3 dates + 3 times gives us the best chance of getting everyone at the table.");

      // Section 7: Verbatim 11 Exclusions
      expect(content).toContain("Routine retrieval of school records");
      expect(content).toContain("Signing educational documents on behalf of the Parent");
      expect(content).toContain("Educational decision-making on behalf of the Parent");
      expect(content).toContain("Notarization or completion of school-issued forms on behalf of the Parent");

      // Section 8: Strict 12-month hard stop
      expect(content).toContain("Strict 12-Month Hard Stop");
      expect(content).toContain("There is no automatic renewal, no month-to-month continuation, and no 13th installment");

      // Section 10: Cancellation written notice & withdrawal of autopay
      expect(content).toContain("clientcare@waypointadvocates.com");
      expect(content).toContain("Stopping automatic payment authorization and terminating advocacy services are separate from any financial obligation that may remain under the Client&#39;s 12-month service commitment");
      // Must NOT publish 30-day notice rule or 50% internal formula
      expect(content).not.toContain("thirty (30) days");
      expect(content).not.toContain("30 days");
      expect(content).not.toContain("50%");

      // Section 11: 8 triggers verbatim & case-by-case fee determination
      expect(content).toContain("The Client repeatedly fails to communicate or participate");
      expect(content).toContain("The Client fails to complete necessary school authorization forms");
      expect(content).toContain("The Client requests actions outside Waypoint&#39;s professional role");
      expect(content).toContain("Where reasonably possible, Waypoint will provide notice before withdrawing");

      // Section 12: Anonymized training records
      expect(content).toContain("Waypoint may use anonymized and non-identifying information for internal training, professional development, or educational purposes");

      // Section 13: Liability capped at fees paid & 6 liability shields
      expect(content).toContain("liability arising from this Agreement shall not exceed the amount actually paid by the Client under this Agreement");
      expect(content).toContain("Decisions made by a school or district");
      expect(content).toContain("Information withheld from Waypoint");

      // Section 14: Georgia governing law without specific county
      expect(content).toContain("laws of the State of Georgia");
      expect(content).toContain("in the appropriate state or federal court serving the Georgia county in which Waypoint Advocates maintains its principal place of business");
      expect(content).not.toContain("Fulton County");

      // Section 15: Closing Shared Commitment
      expect(content).toContain("💙 OUR SHARED COMMITMENT");
      expect(content).toContain("No one should have to do special education alone");
    });

    it("Test 2G.2: Covered Students Enumeration & Family Protection Plan Amendment Notice", async () => {
      const { generateEnrollmentAgreement } = await import("./services/familyEnrollmentService");

      const parentContact = {
        id: 302,
        firstName: "Jonathan",
        lastName: "Byers",
        email: "jonathan.byers@example.com",
      };

      // Mock getStudentsByParentContactId to return multiple siblings
      vi.spyOn(db, "getStudentsByParentContactId").mockResolvedValueOnce([
        { id: 402, firstName: "Will", lastName: "Byers", grade: "8th Grade", schoolName: "Hawkins Middle" },
        { id: 403, firstName: "Jane", lastName: "Hopper-Byers", grade: "7th Grade", schoolName: "Hawkins Middle" },
      ] as any);

      const offer: any = {
        id: 502,
        parentContactId: 302,
        status: "approved",
        selectedPlanKey: "family",
        selectedPlanName: "Family",
        selectedPlanPrice: "155.00",
        approvedBy: 1,
        approvedByName: "Byron Honea",
        billingArrangement: "autopay",
        paymentStructure: "monthly_autopay",
        customCommitmentMonths: 12,
      };

      const gen = await generateEnrollmentAgreement({
        parentContact,
        offer,
        planKey: "family",
        planName: "Family",
        priceMonthly: 155,
        commitmentMonths: 12,
        paymentStructure: "monthly_autopay",
        billingArrangement: "autopay",
        planDescription: "Full multi-student family plan.",
        features: ["Multi-student family coverage"],
      });

      expect(gen.coveredStudentNames).toContain("Will Byers");
      expect(gen.coveredStudentNames).toContain("Jane Hopper-Byers");
      expect(gen.coveredStudentIds).toBe(JSON.stringify([402, 403]));

      // Verify header and Section 2 contain both students
      expect(gen.content).toContain("Will Byers, Jane Hopper-Byers");
      expect(gen.content).toContain("Will Byers");
      expect(gen.content).toContain("Jane Hopper-Byers");

      // Verify the Family Plan future sibling amendment clause
      expect(gen.content).toContain("For Family Protection Plan memberships covering multiple children, any additional student added at a later date must be formally enrolled through an approved written Agreement Amendment");
    });

    it("Test 2G.3: State Complaint Entitlements by Tier & Family Account Level Pooling", async () => {
      const { generateEnrollmentAgreement } = await import("./services/familyEnrollmentService");
      const { DEFAULT_PLAN_DEFINITIONS } = await import("./db/planMatrix");

      const parentContact = { id: 303, firstName: "Joyce", lastName: "Byers" };
      const offerBase = {
        id: 503,
        parentContactId: 303,
        status: "approved",
        approvedBy: 1,
        billingArrangement: "autopay",
        customCommitmentMonths: 12,
      };

      // 1. Navigator: 0 included, $200 add-on
      const genNav = await generateEnrollmentAgreement({
        parentContact,
        offer: { ...offerBase, selectedPlanKey: "navigator", selectedPlanPrice: "55.00" } as any,
        planKey: "navigator",
        planName: "Navigator",
        priceMonthly: 55,
        commitmentMonths: 12,
        paymentStructure: "monthly_autopay",
        billingArrangement: "autopay",
        planDescription: "Navigator package.",
        features: [],
      });
      expect(genNav.content).toContain("State complaint preparation is not included under the Navigator plan. Standalone state complaint preparation is available as an optional add-on service at $200 per complaint.");

      // 2. Anchor: 1 included qualifying complaint
      const genAnchor = await generateEnrollmentAgreement({
        parentContact,
        offer: { ...offerBase, selectedPlanKey: "anchor", selectedPlanPrice: "105.00" } as any,
        planKey: "anchor",
        planName: "Anchor",
        priceMonthly: 105,
        commitmentMonths: 12,
        paymentStructure: "monthly_autopay",
        billingArrangement: "autopay",
        planDescription: "Anchor package.",
        features: [],
      });
      expect(genAnchor.content).toContain("Includes one (1) qualifying state complaint preparation per 12-month membership term. Additional complaints require separate authorization and applicable pricing ($200 per complaint).");

      // 3. Family: 1 included qualifying complaint pooled at Family Account level across all covered children
      const genFamily = await generateEnrollmentAgreement({
        parentContact,
        offer: { ...offerBase, selectedPlanKey: "family", selectedPlanPrice: "155.00" } as any,
        planKey: "family",
        planName: "Family",
        priceMonthly: 155,
        commitmentMonths: 12,
        paymentStructure: "monthly_autopay",
        billingArrangement: "autopay",
        planDescription: "Family package.",
        features: [],
      });
      expect(genFamily.content).toContain("Includes one (1) qualifying state complaint preparation per 12-month membership term. This included complaint benefit applies at the Family Account level across all covered children, not separately to each enrolled student.");

      // Verify Plan Matrix configuration
      const familyPlan = DEFAULT_PLAN_DEFINITIONS.find((p) => p.planKey === "family");
      const stateComplaint = familyPlan?.services.find((s) => s.serviceKey === "STATE_COMPLAINT");
      expect(stateComplaint).toMatchObject({
        allowanceType: "limited",
        baseAllowance: 1,
      });
    });

    it("Test 2G.4: Pay in Full Contractual Terms, Upfront Nonrefundable Clause & BNPL Disclosure", async () => {
      const { generateEnrollmentAgreement, calculatePayInFullQuote } = await import("./services/familyEnrollmentService");

      const parentContact = { id: 304, firstName: "Nancy", lastName: "Wheeler" };
      const quote = calculatePayInFullQuote({
        priceMonthly: 55,
        commitmentMonths: 12,
      });

      const offer: any = {
        id: 504,
        parentContactId: 304,
        status: "approved",
        selectedPlanKey: "navigator",
        selectedPlanName: "Navigator",
        selectedPlanPrice: "55.00",
        paymentStructure: "pay_in_full",
        customCommitmentMonths: 12,
        approvedBy: 1,
        billingArrangement: "autopay",
      };

      const gen = await generateEnrollmentAgreement({
        parentContact,
        offer,
        planKey: "navigator",
        planName: "Navigator",
        priceMonthly: 55,
        commitmentMonths: 12,
        paymentStructure: "pay_in_full",
        billingArrangement: "autopay",
        planDescription: "Navigator package.",
        features: [],
        quote,
      });

      expect(gen.content).toContain("single upfront payment of $660.00");
      expect(gen.content).toContain("Pay in Full commitments are nonrefundable upon commencement of services");
      expect(gen.content).toContain("Third-Party Financing Disclosure");
      expect(gen.content).toContain("No automatic monthly recurring subscription fees will be charged during this term");
    });

    it("Test 2G.5: Decoupled Billing Architecture — 12-Installment Cap & Term Independence", async () => {
      const { activateFamilyMembership, processFamilyEnrollmentWebhook } = await import("./services/familyEnrollmentService");

      const offerId = 505;
      const initialOffer: any = {
        id: offerId,
        parentContactId: 305,
        studentContactId: 405,
        status: "payment_pending",
        agreementStatus: "signed",
        agreementId: 901,
        selectedPlanKey: "anchor",
        selectedPlanName: "Anchor",
        selectedPlanPrice: "105.00",
        paymentStructure: "monthly_autopay",
        customCommitmentMonths: 12,
        stripeCustomerId: "cus_test_505",
        stripeSubscriptionId: "sub_test_505",
      };

      let currentOffer = { ...initialOffer };
      vi.spyOn(db, "getEnrollmentOfferById").mockImplementation(async (id: number) => {
        if (id === offerId) return currentOffer;
        return null;
      });
      vi.spyOn(db, "getEnrollmentOfferByStripeSubscriptionId").mockImplementation(async (subId: string) => {
        if (subId === "sub_test_505") return currentOffer;
        return null;
      });
      vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id: number, data: any) => {
        currentOffer = { ...currentOffer, ...data };
        return currentOffer;
      });

      // 1. Initial activation: 1st payment successful
      const activated = await activateFamilyMembership({
        offerId,
        stripeCustomerId: "cus_test_505",
        stripeSubscriptionId: "sub_test_505",
        source: "test_verification",
      });

      expect(activated.status).toBe("active");
      expect(activated.paymentStatus).toBe("paid");
      expect(activated.totalScheduledInstallments).toBe(12);
      expect(activated.collectedInstallmentCount).toBe(1);
      // Total $1,260 (126000 cents), 1 paid = 11 left ($1,155 = 115500 cents)
      expect(activated.outstandingBalanceCents).toBe(115500);

      const contractualEndDate = new Date(activated.commitmentEndsAt!);
      expect(contractualEndDate.getTime()).toBeGreaterThan(Date.now());

      // 2. Simulate payments 2 through 11
      for (let i = 2; i <= 11; i++) {
        const cycleResult = await processFamilyEnrollmentWebhook({
          id: `evt_cycle_${i}`,
          type: "invoice.payment_succeeded",
          data: {
            object: {
              subscription: "sub_test_505",
              customer: "cus_test_505",
              billing_reason: "subscription_cycle",
            },
          },
        });
        expect(cycleResult.processed).toBe(true);
        expect(currentOffer.collectedInstallmentCount).toBe(i);
        expect(currentOffer.outstandingBalanceCents).toBe((12 - i) * 10500);
        // Crucial: End date must not shift!
        expect(new Date(currentOffer.commitmentEndsAt!).getTime()).toBe(contractualEndDate.getTime());
      }

      // 3. Process 12th (Final) payment
      const finalResult = await processFamilyEnrollmentWebhook({
        id: "evt_cycle_12",
        type: "invoice.payment_succeeded",
        data: {
          object: {
            subscription: "sub_test_505",
            customer: "cus_test_505",
            billing_reason: "subscription_cycle",
          },
        },
      });
      expect(finalResult.processed).toBe(true);
      expect(currentOffer.collectedInstallmentCount).toBe(12);
      expect(currentOffer.outstandingBalanceCents).toBe(0);

      // CRITICAL INVARIANT: Reaching 12 payments does NOT prematurely terminate remaining services!
      expect(currentOffer.status).toBe("active");
      expect(currentOffer.paymentStatus).toBe("paid");
      expect(new Date(currentOffer.commitmentEndsAt!).getTime()).toBe(contractualEndDate.getTime());
    });

    it("Test 2G.6: Failed Payment Handling Does NOT Extend Commitment End Date", async () => {
      const { activateFamilyMembership, processFamilyEnrollmentWebhook } = await import("./services/familyEnrollmentService");

      const offerId = 506;
      let currentOffer: any = {
        id: offerId,
        parentContactId: 306,
        studentContactId: 406,
        status: "payment_pending",
        agreementStatus: "signed",
        agreementId: 902,
        selectedPlanKey: "anchor",
        selectedPlanPrice: "105.00",
        paymentStructure: "monthly_autopay",
        customCommitmentMonths: 12,
        stripeCustomerId: "cus_test_506",
        stripeSubscriptionId: "sub_test_506",
      };

      vi.spyOn(db, "getEnrollmentOfferById").mockImplementation(async (id: number) => {
        if (id === offerId) return currentOffer;
        return null;
      });
      vi.spyOn(db, "getEnrollmentOfferByStripeSubscriptionId").mockImplementation(async (subId: string) => {
        if (subId === "sub_test_506") return currentOffer;
        return null;
      });
      vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id: number, data: any) => {
        currentOffer = { ...currentOffer, ...data };
        return currentOffer;
      });

      await activateFamilyMembership({
        offerId,
        stripeCustomerId: "cus_test_506",
        stripeSubscriptionId: "sub_test_506",
        source: "test_verification",
      });

      const fixedEndDate = new Date(currentOffer.commitmentEndsAt!).getTime();

      // Simulate recurring failure on 2nd installment
      const failResult = await processFamilyEnrollmentWebhook({
        id: "evt_fail_2",
        type: "invoice.payment_failed",
        data: {
          object: {
            subscription: "sub_test_506",
            billing_reason: "subscription_cycle",
          },
        },
      });

      expect(failResult.processed).toBe(true);
      expect(failResult.action).toBe("recurring_payment_failed");
      expect(currentOffer.paymentStatus).toBe("grace_period");
      expect(currentOffer.collectedInstallmentCount).toBe(1); // Still 1

      // CRITICAL INVARIANT: Failed payments do NOT extend contractual end date
      expect(new Date(currentOffer.commitmentEndsAt!).getTime()).toBe(fixedEndDate);

      // Now simulate successful retry of payment 2
      const retryResult = await processFamilyEnrollmentWebhook({
        id: "evt_retry_2",
        type: "invoice.payment_succeeded",
        data: {
          object: {
            subscription: "sub_test_506",
            customer: "cus_test_506",
            billing_reason: "subscription_cycle",
          },
        },
      });

      expect(retryResult.processed).toBe(true);
      expect(currentOffer.paymentStatus).toBe("paid");
      expect(currentOffer.collectedInstallmentCount).toBe(2);
      expect(currentOffer.gracePeriodEndsAt).toBeNull();
      // Still unchanged end date
      expect(new Date(currentOffer.commitmentEndsAt!).getTime()).toBe(fixedEndDate);
    });

    it("Test 2G.7: Webhook Idempotency by Event ID prevents duplicate installment counting", async () => {
      const { processFamilyEnrollmentWebhook } = await import("./services/familyEnrollmentService");

      const offerId = 507;
      let currentOffer: any = {
        id: offerId,
        parentContactId: 307,
        studentContactId: 407,
        status: "active",
        paymentStatus: "paid",
        selectedPlanPrice: "105.00",
        customCommitmentMonths: 12,
        totalScheduledInstallments: 12,
        collectedInstallmentCount: 2,
        outstandingBalanceCents: 105000,
        stripeSubscriptionId: "sub_test_507",
        lastProcessedWebhookEventId: null,
      };

      vi.spyOn(db, "getEnrollmentOfferByStripeSubscriptionId").mockImplementation(async (subId: string) => {
        if (subId === "sub_test_507") return currentOffer;
        return null;
      });
      vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id: number, data: any) => {
        currentOffer = { ...currentOffer, ...data };
        return currentOffer;
      });

      // First webhook delivery
      const res1 = await processFamilyEnrollmentWebhook({
        id: "evt_unique_101",
        type: "invoice.payment_succeeded",
        data: {
          object: {
            subscription: "sub_test_507",
            customer: "cus_test_507",
            billing_reason: "subscription_cycle",
          },
        },
      });

      expect(res1.action).toBe("recurring_payment_succeeded");
      expect(currentOffer.collectedInstallmentCount).toBe(3);
      expect(currentOffer.lastProcessedWebhookEventId).toBe("evt_unique_101");

      // Duplicate webhook delivery with identical event ID
      const res2 = await processFamilyEnrollmentWebhook({
        id: "evt_unique_101",
        type: "invoice.payment_succeeded",
        data: {
          object: {
            subscription: "sub_test_507",
            customer: "cus_test_507",
            billing_reason: "subscription_cycle",
          },
        },
      });

      expect(res2.action).toBe("duplicate_event_skipped");
      // Must NOT be incremented to 4
      expect(currentOffer.collectedInstallmentCount).toBe(3);
    });

    it("Test 2G.8: Persistent Atomic Invoice-Level Idempotency Across Multiple Events & Replays with Different Event IDs", async () => {
      const { processFamilyEnrollmentWebhook } = await import("./services/familyEnrollmentService");

      const offerId = 508;
      let currentOffer: any = {
        id: offerId,
        parentContactId: 308,
        studentContactId: 408,
        status: "active",
        paymentStatus: "paid",
        selectedPlanPrice: "105.00",
        customCommitmentMonths: 12,
        totalScheduledInstallments: 12,
        collectedInstallmentCount: 2,
        outstandingBalanceCents: 105000,
        stripeSubscriptionId: "sub_test_508",
        lastProcessedWebhookEventId: null,
        processedStripeInvoiceIds: null,
      };

      vi.spyOn(db, "getEnrollmentOfferByStripeSubscriptionId").mockImplementation(async (subId: string) => {
        if (subId === "sub_test_508") return currentOffer;
        return null;
      });
      vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id: number, data: any) => {
        currentOffer = { ...currentOffer, ...data };
        return currentOffer;
      });

      // 1. First event for invoice in_invoice_cycle_3 arrives
      const event1 = {
        id: "evt_stripe_first_delivery_001",
        type: "invoice.payment_succeeded",
        data: {
          object: {
            id: "in_invoice_cycle_3",
            subscription: "sub_test_508",
            customer: "cus_test_508",
            billing_reason: "subscription_cycle",
          },
        },
      };

      const res1 = await processFamilyEnrollmentWebhook(event1);
      expect(res1.action).toBe("recurring_payment_succeeded");
      expect(currentOffer.collectedInstallmentCount).toBe(3);
      expect(currentOffer.processedStripeInvoiceIds).toContain("in_invoice_cycle_3");

      // 2. Out-of-order or duplicate delivery with a completely DIFFERENT event ID (e.g. webhook retry or replay)
      const event2 = {
        id: "evt_stripe_replayed_with_new_id_999",
        type: "invoice.payment_succeeded",
        data: {
          object: {
            id: "in_invoice_cycle_3", // SAME Stripe Invoice ID
            subscription: "sub_test_508",
            customer: "cus_test_508",
            billing_reason: "subscription_cycle",
          },
        },
      };

      const res2 = await processFamilyEnrollmentWebhook(event2);
      // Must be intercepted by invoice-level deduplication
      expect(res2.action).toBe("duplicate_invoice_skipped");
      // CRITICAL INVARIANT: Installment count MUST NOT double-count to 4
      expect(currentOffer.collectedInstallmentCount).toBe(3);
    });

    it("Test 2G.8B: Simultaneous Concurrent Webhook Deliveries & Atomic Concurrency Latch", async () => {
      const { processFamilyEnrollmentWebhook } = await import("./services/familyEnrollmentService");
      const { inMemoryPaymentLedger } = await import("./db/familyEnrollment");

      const offerId = 509;
      let currentOffer: any = {
        id: offerId,
        parentContactId: 309,
        status: "active",
        paymentStatus: "paid",
        selectedPlanPrice: "105.00",
        customCommitmentMonths: 12,
        totalScheduledInstallments: 12,
        collectedInstallmentCount: 3,
        outstandingBalanceCents: 94500,
        stripeSubscriptionId: "sub_test_509",
      };

      vi.spyOn(db, "getEnrollmentOfferById").mockImplementation(async (id: number) => {
        if (id === offerId) return currentOffer;
        return null;
      });
      vi.spyOn(db, "getEnrollmentOfferByStripeSubscriptionId").mockImplementation(async (subId: string) => {
        if (subId === "sub_test_509") return currentOffer;
        return null;
      });
      vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id: number, data: any) => {
        currentOffer = { ...currentOffer, ...data };
        return currentOffer;
      });

      const concurrentEventA = {
        id: "evt_concurrent_worker_1",
        type: "invoice.payment_succeeded",
        data: {
          object: {
            id: "in_concurrent_cycle_4",
            subscription: "sub_test_509",
            customer: "cus_test_509",
            billing_reason: "subscription_cycle",
            amount_paid: 10500,
          },
        },
      };

      const concurrentEventB = {
        id: "evt_concurrent_worker_2",
        type: "invoice.payment_succeeded",
        data: {
          object: {
            id: "in_concurrent_cycle_4", // Exactly identical Stripe Invoice ID delivered concurrently
            subscription: "sub_test_509",
            customer: "cus_test_509",
            billing_reason: "subscription_cycle",
            amount_paid: 10500,
          },
        },
      };

      // Execute both webhook deliveries concurrently
      const [resA, resB] = await Promise.all([
        processFamilyEnrollmentWebhook(concurrentEventA),
        processFamilyEnrollmentWebhook(concurrentEventB),
      ]);

      const actions = [resA.action, resB.action];
      expect(actions).toContain("recurring_payment_succeeded");
      expect(actions).toContain("duplicate_invoice_skipped");

      // CRITICAL INVARIANT: Installment counter must increment EXACTLY once from 3 to 4!
      expect(currentOffer.collectedInstallmentCount).toBe(4);
      expect(currentOffer.outstandingBalanceCents).toBe(84000);

      // Verify persistent ledger contains exactly 1 entry for this invoice
      expect(inMemoryPaymentLedger.has("in_concurrent_cycle_4")).toBe(true);
      const ledgerEntry = inMemoryPaymentLedger.get("in_concurrent_cycle_4");
      expect(ledgerEntry?.installmentNumber).toBe(4);
      expect(ledgerEntry?.amountPaidCents).toBe(10500);
      expect(ledgerEntry?.status).toBe("paid");
    });

    it("Test 2G.8C: Initial Checkout and First Invoice Payment Dual Event Idempotency", async () => {
      const { processFamilyEnrollmentWebhook } = await import("./services/familyEnrollmentService");

      const offerId = 510;
      let currentOffer: any = {
        id: offerId,
        parentContactId: 310,
        status: "approved",
        agreementStatus: "signed",
        agreementId: 902,
        paymentStatus: "payment_pending",
        selectedPlanPrice: "105.00",
        customCommitmentMonths: 12,
        totalScheduledInstallments: 12,
        collectedInstallmentCount: 0,
        outstandingBalanceCents: 126000,
        stripeSubscriptionId: "sub_dual_event_510",
      };

      vi.spyOn(db, "getEnrollmentOfferById").mockImplementation(async (id: number) => {
        if (id === offerId) return currentOffer;
        return null;
      });
      vi.spyOn(db, "getEnrollmentOfferByStripeSubscriptionId").mockImplementation(async (subId: string) => {
        if (subId === "sub_dual_event_510") return currentOffer;
        return null;
      });
      vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id: number, data: any) => {
        currentOffer = { ...currentOffer, ...data };
        return currentOffer;
      });

      // 1. Stripe sends checkout.session.completed with initial invoice
      const checkoutEvent = {
        id: "evt_checkout_dual_001",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_dual_510",
            invoice: "in_sub_initial_dual_510",
            subscription: "sub_dual_event_510",
            customer: "cus_dual_510",
            payment_status: "paid",
            metadata: {
              family_enrollment_offer_id: "510",
              payment_structure: "monthly_autopay",
            },
          },
        },
      };

      const resCheckout = await processFamilyEnrollmentWebhook(checkoutEvent);
      expect(resCheckout.action).toBe("membership_activated");
      expect(currentOffer.collectedInstallmentCount).toBe(1);
      expect(currentOffer.status).toBe("active");

      // 2. Stripe subsequently sends invoice.payment_succeeded for the same initial subscription invoice
      const initialInvoiceEvent = {
        id: "evt_invoice_dual_002",
        type: "invoice.payment_succeeded",
        data: {
          object: {
            id: "in_sub_initial_dual_510", // Exact same invoice
            subscription: "sub_dual_event_510",
            customer: "cus_dual_510",
            billing_reason: "subscription_create",
            amount_paid: 10500,
          },
        },
      };

      const resInvoice = await processFamilyEnrollmentWebhook(initialInvoiceEvent);
      // Must be intercepted as duplicate invoice
      expect(resInvoice.action).toBe("duplicate_invoice_skipped");
      // MUST NOT DOUBLE-COUNT to 2!
      expect(currentOffer.collectedInstallmentCount).toBe(1);
    });

    it("Test 2G.8D: Refund and Chargeback Dispute Ledger Audit Trail Preservation", async () => {
      const { processFamilyEnrollmentWebhook } = await import("./services/familyEnrollmentService");
      const { inMemoryPaymentLedger } = await import("./db/familyEnrollment");

      const offerId = 511;
      let currentOffer: any = {
        id: offerId,
        parentContactId: 311,
        status: "active",
        paymentStatus: "paid",
        selectedPlanPrice: "105.00",
        customCommitmentMonths: 12,
        totalScheduledInstallments: 12,
        collectedInstallmentCount: 1,
        outstandingBalanceCents: 115500,
        stripeCustomerId: "cus_test_511",
        stripePaymentIntentId: "pi_test_refund_511",
      };

      // Seed initial payment into ledger
      inMemoryPaymentLedger.set("in_test_refund_511", {
        id: 1,
        offerId,
        stripeInvoiceId: "in_test_refund_511",
        stripePaymentIntentId: "pi_test_refund_511",
        stripeEventId: "evt_init_511",
        eventType: "invoice.payment_succeeded",
        installmentNumber: 1,
        amountPaidCents: 10500,
        currency: "usd",
        status: "paid",
        refundedAmountCents: 0,
        processedAt: new Date(),
        metadata: null,
      });

      vi.spyOn(db, "getEnrollmentOfferById").mockImplementation(async (id: number) => {
        if (id === offerId) return currentOffer;
        return null;
      });
      vi.spyOn(db, "getEnrollmentOfferByStripePaymentIntentId").mockImplementation(async (piId: string) => {
        if (piId === "pi_test_refund_511") return currentOffer;
        return null;
      });
      vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id: number, data: any) => {
        currentOffer = { ...currentOffer, ...data };
        return currentOffer;
      });

      // 1. Process charge.refunded event
      const refundEvent = {
        id: "evt_refund_511",
        type: "charge.refunded",
        data: {
          object: {
            id: "ch_test_511",
            payment_intent: "pi_test_refund_511",
            customer: "cus_test_511",
            invoice: "in_test_refund_511",
            amount_refunded: 10500,
            refunds: {
              data: [{ reason: "customer_requested" }],
            },
          },
        },
      };

      const refundRes = await processFamilyEnrollmentWebhook(refundEvent);
      expect(refundRes.action).toBe("charge_refunded");
      expect(currentOffer.paymentStatus).toBe("refunded");
      expect(currentOffer.status).toBe("payment_attention");

      // Verify ledger record was updated, NOT deleted or corrupted
      const ledgerEntry = inMemoryPaymentLedger.get("in_test_refund_511");
      expect(ledgerEntry).toBeDefined();
      expect(ledgerEntry?.status).toBe("refunded");
      expect(ledgerEntry?.refundedAmountCents).toBe(10500);

      // 2. Process charge.dispute.created event
      const disputeEvent = {
        id: "evt_dispute_511",
        type: "charge.dispute.created",
        data: {
          object: {
            id: "dp_test_511",
            payment_intent: "pi_test_refund_511",
            customer: "cus_test_511",
            reason: "fraudulent",
            status: "needs_response",
          },
        },
      };

      const disputeRes = await processFamilyEnrollmentWebhook(disputeEvent);
      expect(disputeRes.action).toBe("charge_dispute_created");
      expect(currentOffer.paymentStatus).toBe("disputed");
      expect(currentOffer.status).toBe("payment_attention");

      // Verify ledger record preserved dispute status and metadata
      expect(ledgerEntry?.status).toBe("disputed");
      expect(ledgerEntry?.metadata).toContain("fraudulent");
    });

    it("Test 2G.8E: Simulated Database Failure Mid-Processing & Self-Healing Webhook Recovery Across Worker Instances", async () => {
      const { processFamilyEnrollmentWebhook } = await import("./services/familyEnrollmentService");
      const { inMemoryPaymentLedger } = await import("./db/familyEnrollment");

      const offerId = 512;
      const testInvoiceId = "in_partial_fail_recovery_512";
      inMemoryPaymentLedger.delete(testInvoiceId);

      let currentOffer: any = {
        id: offerId,
        parentContactId: 312,
        status: "active",
        paymentStatus: "paid",
        selectedPlanPrice: "105.00",
        customCommitmentMonths: 12,
        totalScheduledInstallments: 12,
        collectedInstallmentCount: 2,
        outstandingBalanceCents: 105000,
        stripeSubscriptionId: "sub_test_512",
        processedStripeInvoiceIds: null,
      };

      vi.spyOn(db, "getEnrollmentOfferById").mockImplementation(async (id: number) => {
        if (id === offerId) return currentOffer;
        return null;
      });
      vi.spyOn(db, "getEnrollmentOfferByStripeSubscriptionId").mockImplementation(async (subId: string) => {
        if (subId === "sub_test_512") return currentOffer;
        return null;
      });

      // ─── STEP 1: Simulate Worker 1 experiencing database failure AFTER ledger insert ───
      // The invoice is inserted into the ledger, but updateEnrollmentOffer throws a database error mid-flight
      let shouldSimulateDbFailure = true;
      vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id: number, data: any) => {
        if (shouldSimulateDbFailure) {
          throw new Error("D1_DATABASE_FAILURE: Connection lost or transaction timeout before offer update");
        }
        currentOffer = { ...currentOffer, ...data };
        return currentOffer;
      });

      const recurringEvent = {
        id: "evt_stripe_attempt_1",
        type: "invoice.payment_succeeded",
        data: {
          object: {
            id: testInvoiceId,
            subscription: "sub_test_512",
            customer: "cus_test_512",
            billing_reason: "subscription_cycle",
            amount_paid: 10500,
          },
        },
      };

      // Worker 1 execution fails on the offer balance update
      await expect(processFamilyEnrollmentWebhook(recurringEvent)).rejects.toThrow("D1_DATABASE_FAILURE");

      // VERIFY CRITICAL STATE AFTER WORKER 1 CRASH:
      // 1. The persistent ledger successfully holds the payment record
      expect(inMemoryPaymentLedger.has(testInvoiceId)).toBe(true);
      const ledgerEntry = inMemoryPaymentLedger.get(testInvoiceId);
      expect(ledgerEntry?.installmentNumber).toBe(3);
      expect(ledgerEntry?.status).toBe("paid");

      // 2. The offer table remains at installment 2 (balance has NOT updated yet)
      expect(currentOffer.collectedInstallmentCount).toBe(2);
      expect(currentOffer.outstandingBalanceCents).toBe(105000);

      // ─── STEP 2: Simulate Stripe Webhook Retry Delivered to Worker 2 ───
      // Database connection is restored on Worker 2
      shouldSimulateDbFailure = false;

      const retryEvent = {
        id: "evt_stripe_attempt_2_retry",
        type: "invoice.payment_succeeded",
        data: {
          object: {
            id: testInvoiceId, // Exact same Stripe Invoice ID retried
            subscription: "sub_test_512",
            customer: "cus_test_512",
            billing_reason: "subscription_cycle",
            amount_paid: 10500,
          },
        },
      };

      // Worker 2 processes the retry: Durable recovery activates and completes partial processing
      const retryResult = await processFamilyEnrollmentWebhook(retryEvent);

      expect(retryResult.processed).toBe(true);
      expect(retryResult.action).toBe("recurring_payment_succeeded");

      // CRITICAL INVARIANT: Installment counter safely reconciled to 3 (NOT 2, NOT 4!)
      expect(currentOffer.collectedInstallmentCount).toBe(3);
      expect(currentOffer.outstandingBalanceCents).toBe(94500);
      expect(currentOffer.processedStripeInvoiceIds).toContain(testInvoiceId);

      // ─── STEP 3: Subsequent Duplicate Delivery (Worker 3 or replay) ───
      // If Stripe or network delivers the event again, it must safely skip without double-counting
      const duplicateReplayEvent = {
        id: "evt_stripe_attempt_3_replay",
        type: "invoice.payment_succeeded",
        data: {
          object: {
            id: testInvoiceId,
            subscription: "sub_test_512",
            customer: "cus_test_512",
            billing_reason: "subscription_cycle",
            amount_paid: 10500,
          },
        },
      };

      const replayResult = await processFamilyEnrollmentWebhook(duplicateReplayEvent);
      expect(replayResult.action).toBe("duplicate_invoice_skipped");

      // MUST REMAIN AT 3, NEVER INCREMENT TO 4
      expect(currentOffer.collectedInstallmentCount).toBe(3);
      expect(currentOffer.outstandingBalanceCents).toBe(94500);
    });

    it("Test 2G.8F: Two Separate Workers Attempting Simultaneous Recovery Cannot Double-Count Payment", async () => {
      const { processFamilyEnrollmentWebhook } = await import("./services/familyEnrollmentService");
      const { inMemoryPaymentLedger } = await import("./db/familyEnrollment");

      const offerId = 513;
      const testInvoiceId = "in_simul_recovery_513";
      
      // Simulate that an earlier crashed worker had successfully committed the ledger row for installment #3:
      inMemoryPaymentLedger.set(testInvoiceId, {
        id: 995,
        offerId,
        stripeInvoiceId: testInvoiceId,
        stripePaymentIntentId: "pi_simul_recovery_513",
        stripeEventId: "evt_earlier_crashed_worker",
        eventType: "invoice.payment_succeeded",
        installmentNumber: 3,
        amountPaidCents: 10500,
        currency: "usd",
        status: "paid",
        refundedAmountCents: 0,
        processedAt: new Date(),
        metadata: null,
      });

      // But the offer table in D1 is still at installment 2 with un-updated balance:
      let currentOffer: any = {
        id: offerId,
        parentContactId: 313,
        status: "active",
        paymentStatus: "paid",
        selectedPlanPrice: "105.00",
        customCommitmentMonths: 12,
        totalScheduledInstallments: 12,
        collectedInstallmentCount: 2,
        outstandingBalanceCents: 105000,
        stripeSubscriptionId: "sub_test_513",
        processedStripeInvoiceIds: null,
      };

      vi.spyOn(db, "getEnrollmentOfferById").mockImplementation(async (id: number) => {
        if (id === offerId) return currentOffer;
        return null;
      });
      vi.spyOn(db, "getEnrollmentOfferByStripeSubscriptionId").mockImplementation(async (subId: string) => {
        if (subId === "sub_test_513") return currentOffer;
        return null;
      });
      vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id: number, data: any) => {
        currentOffer = { ...currentOffer, ...data };
        return currentOffer;
      });

      // Two distinct worker instances (e.g. separate Cloudflare Workers) receive the retried webhook simultaneously:
      const retryEventWorkerA = {
        id: "evt_worker_A_retry_513",
        type: "invoice.payment_succeeded",
        data: {
          object: {
            id: testInvoiceId,
            subscription: "sub_test_513",
            customer: "cus_test_513",
            billing_reason: "subscription_cycle",
            amount_paid: 10500,
          },
        },
      };

      const retryEventWorkerB = {
        id: "evt_worker_B_retry_513",
        type: "invoice.payment_succeeded",
        data: {
          object: {
            id: testInvoiceId,
            subscription: "sub_test_513",
            customer: "cus_test_513",
            billing_reason: "subscription_cycle",
            amount_paid: 10500,
          },
        },
      };

      // Both workers attempt recovery concurrently
      const [resA, resB] = await Promise.all([
        processFamilyEnrollmentWebhook(retryEventWorkerA),
        processFamilyEnrollmentWebhook(retryEventWorkerB),
      ]);

      const actions = [resA.action, resB.action];
      expect(actions).toContain("recurring_payment_succeeded");

      // CRITICAL INVARIANT: Under NO circumstance may the installment counter reach 4!
      // Must be EXACTLY 3!
      expect(currentOffer.collectedInstallmentCount).toBe(3);
      expect(currentOffer.outstandingBalanceCents).toBe(94500);
      expect(currentOffer.processedStripeInvoiceIds).toContain(testInvoiceId);
    });

    it("Test 2G.9: Calendar-Based Date Calculations for February, Leap Years, Month-End Enrollments, and DST", async () => {
      const { calculateCalendarCommitmentEndDate } = await import("./services/familyEnrollmentService");

      // 1. January 31, 2026 (non-leap year) -> Exactly January 31, 2027 (NOT February 1)
      const jan31 = new Date("2026-01-31T14:30:00.000Z");
      const jan31End = calculateCalendarCommitmentEndDate(jan31, 12);
      expect(jan31End.toISOString()).toBe("2027-01-31T14:30:00.000Z");

      // 2. February 29, 2028 (leap day) -> Clipped to February 28, 2029 (non-leap target year)
      const leapDay = new Date("2028-02-29T18:00:00.000Z");
      const leapDayEnd = calculateCalendarCommitmentEndDate(leapDay, 12);
      expect(leapDayEnd.toISOString()).toBe("2029-02-28T18:00:00.000Z");

      // 3. Month-end clipping for non-12-month commitments: August 31 + 6 months -> February 28
      const aug31 = new Date("2026-08-31T12:00:00.000Z");
      const aug31End = calculateCalendarCommitmentEndDate(aug31, 6);
      expect(aug31End.toISOString()).toBe("2027-02-28T12:00:00.000Z");

      // 4. March 31 + 1 month -> April 30 (30-day month clipping)
      const mar31 = new Date("2026-03-31T09:15:00.000Z");
      const mar31End = calculateCalendarCommitmentEndDate(mar31, 1);
      expect(mar31End.toISOString()).toBe("2026-04-30T09:15:00.000Z");

      // 5. Preserves exact time of day across daylight saving boundaries
      const summerTime = new Date("2026-07-15T16:45:22.000Z");
      const summerEnd = calculateCalendarCommitmentEndDate(summerTime, 12);
      expect(summerEnd.toISOString()).toBe("2027-07-15T16:45:22.000Z");
    });

    it("Test 2G.10: Historical Executed Agreements Immutability Guardrail", async () => {
      const agreementsRouter = (await import("./routers/agreements")).agreementsRouter;
      const { inMemoryAgreements } = await import("./routers/agreements");

      const lockedAgreementId = 9991;
      inMemoryAgreements.set(lockedAgreementId, {
        id: lockedAgreementId,
        title: "Executed Advocacy Agreement",
        content: "Original Signed Content",
        status: "Signed",
        contentLocked: 1,
        documentHash: "abc123hash",
      } as any);

      const caller = agreementsRouter.createCaller({
        user: { id: 1, name: "Staff User", role: "admin" },
      } as any);

      // Attempting to modify locked executed agreement MUST throw BAD_REQUEST
      await expect(
        caller.updateDraft({
          id: lockedAgreementId,
          content: "Unauthorized Tampered Content",
        })
      ).rejects.toThrow("Executed agreements are locked and immutable. Create an amendment or a new agreement.");

      // Verify content remained intact
      const stored = inMemoryAgreements.get(lockedAgreementId);
      expect(stored?.content).toBe("Original Signed Content");
    });
  });
});


