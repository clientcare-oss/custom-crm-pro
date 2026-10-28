import { describe, it, expect, beforeEach } from "vitest";
import {
  getParentProfile,
  updateParentProfileFields,
  requestEmailChange,
  verifyEmailChange,
  requestPhoneChange,
  verifyPhoneChange,
  setContactConcern,
  resolveContactConcern,
  getParentProfileChangeHistory,
  getStaffNotifications
} from "./db/parentProfile";

describe("Parent Profile Management & Contact Protection System", () => {
  const TEST_PARENT_ID = 99881;

  beforeEach(async () => {
    // Initialize test parent profile
    await updateParentProfileFields({
      parentContactId: TEST_PARENT_ID,
      actorId: 1,
      actorName: "System Test",
      actorRole: "system",
      source: "crm",
      updates: {
        preferredName: "Jane",
        phone: "(404) 555-0100",
        altPhone: "(404) 555-0199",
        address: "123 Peachtree St NE, Atlanta, GA 30303",
        preferredContactMethod: "email",
        emergencyContactName: "Robert Smith",
        emergencyContactRelationship: "Spouse",
        emergencyContactPhone: "(404) 555-0155"
      }
    });
  });

  it("retrieves parent profile correctly with linked student context", async () => {
    const res = await getParentProfile(TEST_PARENT_ID);
    expect(res).toBeDefined();
    expect(res?.preferredName).toBe("Jane");
    expect(res?.phone).toBe("(404) 555-0100");
    expect(res?.preferredContactMethod).toBe("email");
  });

  it("creates permanent append-only audit history upon modifying profile fields", async () => {
    const initialHistory = await getParentProfileChangeHistory(TEST_PARENT_ID);
    const initialCount = initialHistory.length;

    await updateParentProfileFields({
      parentContactId: TEST_PARENT_ID,
      actorId: 2,
      actorName: "Jane Smith",
      actorRole: "client",
      source: "portal",
      updates: {
        preferredName: "Janie",
        address: "456 Piedmont Rd NE, Atlanta, GA 30305"
      }
    });

    const updatedHistory = await getParentProfileChangeHistory(TEST_PARENT_ID);
    expect(updatedHistory.length).toBeGreaterThan(initialCount);

    const addressRecord = updatedHistory.find(h => h.fieldModified === "Mailing Address");
    expect(addressRecord).toBeDefined();
    expect(addressRecord?.newValue).toBe("456 Piedmont Rd NE, Atlanta, GA 30305");
    expect(addressRecord?.actorRole).toBe("client");
    expect(addressRecord?.source).toBe("portal");
    expect(addressRecord?.verificationStatus).toBe("verified");
  });

  it("flags legal name changes for staff contractual review", async () => {
    const res = await updateParentProfileFields({
      parentContactId: TEST_PARENT_ID,
      actorId: 2,
      actorName: "Jane Smith",
      actorRole: "client",
      source: "portal",
      updates: {
        name: "Jane Smith-Doe"
      }
    });

    expect(res.legalNameReviewRequired).toBe(true);
    // Contractual identity remains protected until staff approval
    expect(res.profile.name).not.toBe("Jane Smith-Doe");

    const history = await getParentProfileChangeHistory(TEST_PARENT_ID);
    const legalNameRecord = history.find(h => h.fieldModified === "Legal Name");
    expect(legalNameRecord).toBeDefined();
    expect(legalNameRecord?.newValue).toBe("Jane Smith-Doe");
    expect(legalNameRecord?.approvalStatus).toBe("pending_approval");
  });

  it("handles email change verification workflow securely", async () => {
    // 1. Request email change
    const requestRes = await requestEmailChange({
      parentContactId: TEST_PARENT_ID,
      proposedEmail: "jane.updated@example.com",
      actorId: 2,
      actorName: "Jane Smith"
    });

    expect(requestRes.token).toBeDefined();
    expect(requestRes.message).toContain("Verification email sent");

    // Profile still shows current verified email while pending
    const pendingProfile = await getParentProfile(TEST_PARENT_ID);
    expect(pendingProfile?.pendingEmail).toBe("jane.updated@example.com");

    // 2. Staff / client completes verification with token
    const verifyRes = await verifyEmailChange(requestRes.token);
    expect(verifyRes.success).toBe(true);
    expect(verifyRes.verifiedEmail).toBe("jane.updated@example.com");

    // Profile now has new email as active, and pendingEmail cleared
    const verifiedProfile = await getParentProfile(TEST_PARENT_ID);
    expect(verifiedProfile?.email).toBe("jane.updated@example.com");
    expect(verifiedProfile?.pendingEmail).toBeNull();

    // Verify audit record exists with verificationStatus verified
    const history = await getParentProfileChangeHistory(TEST_PARENT_ID);
    const emailAudit = history.find(h => h.fieldModified === "Primary Email" && h.newValue === "jane.updated@example.com");
    expect(emailAudit).toBeDefined();
    expect(emailAudit?.verificationStatus).toBe("verified");
  });

  it("handles mobile phone change verification with 6-digit code", async () => {
    // 1. Request phone change
    const requestRes = await requestPhoneChange({
      parentContactId: TEST_PARENT_ID,
      proposedPhone: "(404) 555-9988",
      actorId: 2,
      actorName: "Jane Smith"
    });

    expect(requestRes.code).toBeDefined();
    expect(requestRes.code).toHaveLength(6);

    // Profile shows proposed phone as pending
    const pendingProfile = await getParentProfile(TEST_PARENT_ID);
    expect(pendingProfile?.pendingPhone).toBe("(404) 555-9988");

    // 2. Submit verification code
    const verifyRes = await verifyPhoneChange({
      parentContactId: TEST_PARENT_ID,
      code: requestRes.code
    });

    expect(verifyRes.success).toBe(true);
    expect(verifyRes.verifiedPhone).toBe("(404) 555-9988");

    // Profile now active with verified phone
    const verifiedProfile = await getParentProfile(TEST_PARENT_ID);
    expect(verifiedProfile?.phone).toBe("(404) 555-9988");
    expect(verifiedProfile?.pendingPhone).toBeNull();
  });

  it("flags and resolves staff contact concerns properly", async () => {
    // 1. Flag concern
    const flagRes = await setContactConcern({
      parentContactId: TEST_PARENT_ID,
      reason: "Disconnected phone number",
      notes: "Tried calling parent for IEP meeting; line is disconnected.",
      followUpDate: "2026-11-01",
      assignedTo: "Byron Honea",
      reportedBy: "Intake Coordinator"
    });

    expect(flagRes.success).toBe(true);
    expect(flagRes.profile.contactConcernStatus).toBe("active");
    expect(flagRes.profile.contactConcernReason).toBe("Disconnected phone number");

    // Notifications generated for staff
    const notifs = await getStaffNotifications(TEST_PARENT_ID);
    expect(notifs.some(n => n.type === "contact_concern")).toBe(true);

    // 2. Resolve concern
    const resolveRes = await resolveContactConcern({
      parentContactId: TEST_PARENT_ID,
      resolvedBy: "Byron Honea"
    });

    expect(resolveRes.success).toBe(true);
    expect(resolveRes.profile.contactConcernStatus).toBe("resolved");

    // Check history logs resolution
    const history = await getParentProfileChangeHistory(TEST_PARENT_ID);
    const concernAudit = history.find(h => h.fieldModified === "Contact Concern Status");
    expect(concernAudit).toBeDefined();
    expect(concernAudit?.newValue).toBe("resolved");
  });

  it("complies strictly with AGENTS.md Rule F (no Master Coach)", async () => {
    const profileRes = await getParentProfile(TEST_PARENT_ID);
    const serialized = JSON.stringify(profileRes);
    expect(serialized).not.toMatch(/master\s*coach/i);
  });
});
