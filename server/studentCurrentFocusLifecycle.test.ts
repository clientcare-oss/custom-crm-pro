import { describe, it, expect } from "vitest";
import { resolveFamilyLifecycleStage } from "../client/src/components/students/StudentCurrentFocusPanel";

describe("Student Profile Dynamic Current Focus — Family Lifecycle Stage Resolver", () => {
  it("should classify an unpaid new discovery inquiry as DISCOVERY", () => {
    const parent = { id: 101, firstName: "Eleanor", lastName: "Vance", jobTitle: "Parent" };
    const student = { id: 201, firstName: "Leo", lastName: "Vance", parentContactId: 101 };
    const leads = [{ id: 901, contactId: 101, status: "New" }];
    const discoveryCalls = [{ id: 301, contactId: 101, studentContactId: 201, status: "Preparing" }];

    const result = resolveFamilyLifecycleStage({
      parent,
      student,
      leads,
      discoveryCalls,
      contracts: [],
      invoices: [],
    });

    expect(result.stage).toBe("DISCOVERY");
    expect(result.isEstablishedClient).toBe(false);
    expect(result.hasSignedContract).toBe(false);
    expect(result.hasPaidInvoice).toBe(false);
  });

  it("should classify a completed discovery call without enrollment as DISCOVERY", () => {
    const parent = { id: 101, firstName: "Eleanor", lastName: "Vance", jobTitle: "Parent", portalAccess: "active" };
    const student = { id: 201, firstName: "Leo", lastName: "Vance", parentContactId: 101 };
    const leads = [{ id: 901, contactId: 101, status: "Discovery Completed" }];
    const discoveryCalls = [{ id: 301, contactId: 101, studentContactId: 201, status: "completed" }];

    const result = resolveFamilyLifecycleStage({
      parent,
      student,
      leads,
      discoveryCalls,
      contracts: [],
      invoices: [],
    });

    // Portal access and completed discovery alone must NOT promote to ACTIVE
    expect(result.stage).toBe("DISCOVERY");
    expect(result.isEstablishedClient).toBe(false);
    expect(result.latestDiscoveryCall?.status).toBe("completed");
  });

  it("should classify an approved family with pending offer as ENROLLMENT_PENDING", () => {
    const parent = {
      id: 101,
      firstName: "Eleanor",
      lastName: "Vance",
      jobTitle: "Parent",
      lifecycleStage: "Onboarding",
      planTier: "$105 / Month Comprehensive IEP Support",
    };
    const student = { id: 201, firstName: "Leo", lastName: "Vance", parentContactId: 101 };
    const leads = [{ id: 901, contactId: 101, status: "Approved for Enrollment" }];
    const discoveryCalls = [{ id: 301, contactId: 101, studentContactId: 201, status: "completed" }];

    const result = resolveFamilyLifecycleStage({
      parent,
      student,
      leads,
      discoveryCalls,
      contracts: [],
      invoices: [],
    });

    expect(result.stage).toBe("ENROLLMENT_PENDING");
    expect(result.isEstablishedClient).toBe(false);
  });

  it("should classify an established paying family with active contract as ACTIVE", () => {
    const parent = {
      id: 1,
      firstName: "Shawn",
      lastName: "Sheep",
      jobTitle: "Parent / Client",
      contractStatus: "Active",
      billingStatus: "Current",
    };
    const student = { id: 2, firstName: "Woolbert", lastName: "Sheep", parentContactId: 1 };
    const contracts = [{ id: 501, clientId: 1, status: "Active" }];
    const invoices = [{ id: 601, clientId: 1, status: "Paid" }];

    const result = resolveFamilyLifecycleStage({
      parent,
      student,
      contracts,
      invoices,
    });

    expect(result.stage).toBe("ACTIVE");
    expect(result.isEstablishedClient).toBe(true);
    expect(result.hasSignedContract).toBe(true);
    expect(result.hasPaidInvoice).toBe(true);
  });

  it("should classify an active client approaching renewal (<= 45 days) as RENEWAL", () => {
    const parent = {
      id: 1,
      firstName: "Shawn",
      lastName: "Sheep",
      jobTitle: "Parent / Client",
      contractStatus: "Active",
      billingStatus: "Current",
      renewalDaysRemaining: 28,
    };
    const student = { id: 2, firstName: "Woolbert", lastName: "Sheep", parentContactId: 1 };
    const contracts = [{ id: 501, clientId: 1, status: "Active" }];

    const result = resolveFamilyLifecycleStage({
      parent,
      student,
      contracts,
      invoices: [],
    });

    expect(result.stage).toBe("RENEWAL");
    expect(result.isEstablishedClient).toBe(true);
    expect(result.isRenewalApproaching).toBe(true);
    expect(result.renewalDaysRemaining).toBe(28);
  });

  it("should ensure multiple students in the same family share the parent anchor membership state", () => {
    const parent = {
      id: 50,
      firstName: "Elena",
      lastName: "Santiago",
      jobTitle: "Parent / Client",
      contractStatus: "Active",
      billingStatus: "Current",
    };
    const studentA = { id: 51, firstName: "Elijah", lastName: "Santiago", parentContactId: 50 };
    const studentB = { id: 52, firstName: "Sofia", lastName: "Santiago", parentContactId: 50 };
    const contracts = [{ id: 501, clientId: 50, status: "Active" }];

    const resultA = resolveFamilyLifecycleStage({
      parent,
      student: studentA,
      contracts,
    });

    const resultB = resolveFamilyLifecycleStage({
      parent,
      student: studentB,
      contracts,
    });

    expect(resultA.stage).toBe("ACTIVE");
    expect(resultB.stage).toBe("ACTIVE");
    expect(resultA.stage).toBe(resultB.stage);
    expect(resultA.hasSignedContract).toBe(true);
    expect(resultB.hasSignedContract).toBe(true);
  });
});
