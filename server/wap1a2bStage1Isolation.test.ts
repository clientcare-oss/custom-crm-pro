import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { inMemoryContacts } from "./db/contacts";
import { inMemoryVaultFiles, inMemoryVaultAnalyses, inMemoryIepFamilies } from "./routers/clientFiles";
import { resetStaffAccessMemoryToDefaults } from "./_core/staffAccess";
import { authorizeStorageKeyAccess } from "./_core/storageProxy";
import { authorizeFileUploadRequest } from "./fileUpload";
import type { TrpcContext, AuthenticatedUser } from "./_core/trpc";

function makeAnonymousCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function makeParentCtx(parentContactId: number, email: string, name: string): TrpcContext {
  const user: AuthenticatedUser = {
    id: parentContactId,
    openId: `user_parent_${parentContactId}`,
    email,
    name,
    loginMethod: "clerk",
    role: "client",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    portalContactId: parentContactId,
    req: { protocol: "https", headers: {} } as unknown as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  } as any;
}

function makeStaffCtx(params: {
  id: number;
  openId: string;
  name: string;
  email: string;
  role?: "admin" | "user" | "advocate";
  loginMethod?: string;
}): TrpcContext {
  const user: AuthenticatedUser = {
    id: params.id,
    openId: params.openId,
    email: params.email,
    name: params.name,
    loginMethod: params.loginMethod ?? "clerk",
    role: (params.role ?? "user") as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("WAP 1A.2B-1 & 1A.2B-1B: Stage 1 Security & Functional Permission Verification", () => {
  const parentAId = 98810;
  const studentAId = 98811;
  const parentA2Id = 98812;
  const parentBId = 98820;
  const studentBId = 98821;
  const familyAFileId = 98900;
  const familyBFileId = 98901;
  const familyBFamilyId = 98950;

  beforeAll(async () => {
    await resetStaffAccessMemoryToDefaults();

    // Seed Family A (Eleanor & David Harrison + Lucas Harrison)
    inMemoryContacts.set(parentAId, {
      id: parentAId,
      ownerId: 9060114,
      type: "parent",
      jobTitle: "Parent",
      firstName: "Eleanor",
      lastName: "Harrison",
      email: "eleanor.stage1@example.com",
      portalUserId: parentAId,
      portalAccess: "active",
      status: "Active",
    });
    inMemoryContacts.set(parentA2Id, {
      id: parentA2Id,
      ownerId: 9060114,
      type: "parent",
      jobTitle: "Parent",
      firstName: "David",
      lastName: "Harrison",
      email: "david.stage1@example.com",
      status: "Active",
    });
    inMemoryContacts.set(studentAId, {
      id: studentAId,
      ownerId: 9060114,
      type: "student",
      jobTitle: "Student",
      parentContactId: parentAId,
      firstName: "Lucas",
      lastName: "Harrison",
      gradeLevel: "5th Grade",
      schoolName: "Peachtree Elementary",
      caseId: "WP-STAGE1-A",
      status: "Active",
    });

    // Seed Family B (Marcus & Chloe Vance)
    inMemoryContacts.set(parentBId, {
      id: parentBId,
      ownerId: 9060114,
      type: "parent",
      jobTitle: "Parent",
      firstName: "Marcus",
      lastName: "Vance",
      email: "marcus.stage1@example.com",
      portalUserId: parentBId,
      portalAccess: "active",
      status: "Active",
    });
    inMemoryContacts.set(studentBId, {
      id: studentBId,
      ownerId: 9060114,
      type: "student",
      jobTitle: "Student",
      parentContactId: parentBId,
      firstName: "Chloe",
      lastName: "Vance",
      gradeLevel: "8th Grade",
      schoolName: "Inman Middle",
      caseId: "WP-STAGE1-B",
      status: "Active",
    });

    // Seed vault files for Family A and Family B
    inMemoryVaultFiles.set(parentAId, [
      {
        id: familyAFileId,
        clientId: parentAId,
        studentId: studentAId,
        studentContactId: studentAId,
        fileName: "Lucas_Harrison_IEP.pdf",
        fileUrl: "/storage/client-files/98810/lucas-iep.pdf",
        fileKey: "client-files/98810/lucas-iep.pdf",
        fileSize: 1024,
        mimeType: "application/pdf",
        uploadedBy: parentAId,
      },
    ]);
    inMemoryVaultFiles.set(parentBId, [
      {
        id: familyBFileId,
        clientId: parentBId,
        studentId: studentBId,
        studentContactId: studentBId,
        fileName: "Chloe_Vance_Confidential_IEP.pdf",
        fileUrl: "/storage/client-files/98820/chloe-iep.pdf",
        fileKey: "client-files/98820/chloe-iep.pdf",
        fileSize: 1024,
        mimeType: "application/pdf",
        uploadedBy: parentBId,
      },
    ]);
    inMemoryVaultAnalyses.set(familyBFileId, {
      id: 777,
      fileId: familyBFileId,
      studentContactId: studentBId,
      rawAnalysisJson: JSON.stringify({ studentName: "Chloe Vance", documentType: "Annual IEP" }),
    });
    inMemoryIepFamilies.set(studentBId, [
      {
        id: familyBFamilyId,
        studentContactId: studentBId,
        clientId: parentBId,
        schoolYear: "2026-2027",
        baseIepDocumentId: familyBFileId,
        isCurrentIep: 1,
        confirmationStatus: "System Identified",
      },
    ]);
  });

  describe("1. Unauthenticated Public Access Prevention", () => {
    const anonCaller = appRouter.createCaller(makeAnonymousCtx());

    it("blocks unauthenticated callers from contacts, PWN Decoder, First Mate, Parent Profile, and Review Tracker", async () => {
      await expect(anonCaller.contacts.list()).rejects.toThrow();
      await expect(anonCaller.contacts.get({ id: parentAId })).rejects.toThrow();
      await expect(
        anonCaller.contacts.create({ firstName: "Anon", lastName: "Hacker" })
      ).rejects.toThrow();
      await expect(
        anonCaller.contacts.update({ id: parentAId, firstName: "Tampered" })
      ).rejects.toThrow();
      await expect(
        anonCaller.pwnDecoder.listReviewsByStudent({ studentContactId: studentAId })
      ).rejects.toThrow();
      await expect(
        anonCaller.firstMate.ask({ question: "What should I say?" })
      ).rejects.toThrow();
      await expect(
        anonCaller.parentProfile.getProfile({ parentContactId: parentAId })
      ).rejects.toThrow();
      await expect(
        anonCaller.reviewTracker.getByStudent({ studentId: studentAId })
      ).rejects.toThrow();
      await expect(
        anonCaller.iep.getStudentIepDemographics({ studentContactId: studentAId })
      ).rejects.toThrow();
    });
  });

  describe("2. Call Center Client Account Administration & Field-Level Boundaries (Wyatt 9060250)", () => {
    const wyattCaller = appRouter.createCaller(
      makeStaffCtx({
        id: 9060250,
        openId: "user_3KPhcRBro_wyatt",
        name: "Wyatt Smith",
        email: "wyatt.smith@waypointadvocates.com",
      })
    );

    it("allows Wyatt (Call Center) to create and edit ordinary client contact records", async () => {
      const created = await wyattCaller.contacts.create({
        firstName: "Hannah",
        lastName: "Montgomery",
        email: "hannah.montgomery@example.com",
        phone: "(404) 555-0144",
        city: "Atlanta",
        state: "GA",
      });
      expect(created).toBeDefined();

      const updated = await wyattCaller.contacts.update({
        id: parentAId,
        phone: "(404) 555-8899",
        bestTimeToCall: "Morning 9am-11am",
        secondParentName: "David Harrison",
      });
      expect(updated).toBeDefined();
    });

    it("allows Wyatt (Call Center) to provision/activate parent portals, resend links, reset client passwords, and toggle client portal access", async () => {
      // Provision parent portal access
      const provisioned = await wyattCaller.portalProvisioning.provisionPortalAccess({
        contactId: parentA2Id,
        email: "david.stage1@example.com",
      });
      expect(provisioned.success).toBe(true);

      // Resend portal link
      const resent = await wyattCaller.portalProvisioning.resendPortalLink({
        contactId: parentAId,
        email: "eleanor.stage1@example.com",
      });
      expect(resent.success).toBe(true);
      expect(resent.message).toContain("eleanor.stage1@example.com");

      // Set / reset client portal password
      const pwdSet = await wyattCaller.portalAuth.setClientPassword({
        contactId: parentAId,
        email: "eleanor.stage1@example.com",
        password: "SafeClientPassword2026!",
      });
      expect(pwdSet.success).toBe(true);

      // Disable and re-enable client portal access
      const disabled = await wyattCaller.portalProvisioning.setPortalAccessEnabled({
        contactId: parentAId,
        enabled: false,
      });
      expect(disabled.portalAccess).toBe("disabled");

      const reenabled = await wyattCaller.portalProvisioning.setPortalAccessEnabled({
        contactId: parentAId,
        enabled: true,
      });
      expect(reenabled.portalAccess).toBe("active");
    });

    it("allows Wyatt (Call Center) to change or reassign client account ownership and parent/student portal associations", async () => {
      const linked = await wyattCaller.contacts.linkPortalUser({
        contactId: parentA2Id,
        portalUserId: parentA2Id,
      });
      expect(linked).toBeDefined();

      const reassigned = await wyattCaller.contacts.reassignClientOwnership({
        studentContactId: studentAId,
        newParentContactId: parentA2Id,
        reason: "Co-parent primary portal holder update requested during intake call",
      });
      expect(reassigned.success).toBe(true);

      // Restore studentAId parentContactId to parentAId for subsequent tests
      await wyattCaller.contacts.reassignClientOwnership({
        studentContactId: studentAId,
        newParentContactId: parentAId,
        reason: "Restore primary parent association",
      });
    });

    it("blocks Wyatt (Call Center) from creating, modifying, or deactivating employee or management accounts or escalating his own privileges", async () => {
      // Cannot onboard or invite employees
      await expect(
        wyattCaller.team.onboardEmployee({
          name: "Unauthorized Staff",
          email: "unauth.staff@waypointadvocates.com",
          jobTitle: "Advocate",
          primaryRole: "advocate",
        })
      ).rejects.toThrow(/FORBIDDEN|Only authorized management/i);

      // Cannot elevate own role or permissions
      await expect(
        wyattCaller.team.updateStaffAccess({
          targetUserId: 9060250,
          primaryRole: "management",
          hasAdminAccess: true,
        })
      ).rejects.toThrow(/FORBIDDEN|permission/i);

      // Cannot modify Protected Owners or Kyle
      await expect(
        wyattCaller.team.deactivateEmployee({
          targetUserId: 9060114,
        })
      ).rejects.toThrow(/FORBIDDEN|permission/i);
      await expect(
        wyattCaller.team.deactivateEmployee({
          targetUserId: 9060249,
        })
      ).rejects.toThrow(/FORBIDDEN|permission/i);
    });

    it("blocks Wyatt (Call Center) from modifying protected student educational/medical fields via contacts.update", async () => {
      await expect(
        wyattCaller.contacts.update({
          id: studentAId,
          schoolName: "Unauthorized School Change",
        })
      ).rejects.toThrow(/student-edit authorization/i);

      await expect(
        wyattCaller.contacts.update({
          id: studentAId,
          gradeLevel: "11th Grade",
        })
      ).rejects.toThrow(/student-edit authorization/i);

      await expect(
        wyattCaller.contacts.update({
          id: studentAId,
          iepEligibility: "Autism Spectrum",
          medicalDiagnoses: "Confidential Diagnosis",
        })
      ).rejects.toThrow(/student-edit authorization/i);

      await expect(
        wyattCaller.contacts.update({
          id: studentAId,
          dateOfBirth: "2015-04-10",
        })
      ).rejects.toThrow(/student-edit authorization/i);
    });

    it("blocks Wyatt (Call Center) from modifying protected billing, scholarship, contract, and lifecycle fields", async () => {
      await expect(
        wyattCaller.contacts.update({
          id: parentAId,
          planTier: "Scholarship",
        })
      ).rejects.toThrow(/Financial or billing authorization is required/i);

      await expect(
        wyattCaller.contacts.update({
          id: parentAId,
          hourlyRate: "250.00",
          billingStatus: "Complimentary",
        })
      ).rejects.toThrow(/Financial or billing authorization is required/i);

      await expect(
        wyattCaller.contacts.update({
          id: parentAId,
          contractStatus: "Renewed",
          stripeCustomerId: "cus_tampered",
        })
      ).rejects.toThrow(/Financial or billing authorization is required/i);

      await expect(
        wyattCaller.contacts.update({
          id: parentAId,
          managerApprovalStatus: "Approved",
        })
      ).rejects.toThrow(/Financial or billing authorization|Manager authorization required/i);

      await expect(
        wyattCaller.contacts.updateJourneyState({
          contactId: parentAId,
          operationalState: "Scholarship Pending",
          portalLifecycleStatus: "Disabled",
        })
      ).rejects.toThrow(/restricted for your role|authorization required/i);
    });
  });

  describe("3. Parent Self-Service Contact & Attorney Editing vs. Protected Field Isolation", () => {
    const parentACaller = appRouter.createCaller(
      makeParentCtx(parentAId, "eleanor.stage1@example.com", "Eleanor Harrison")
    );

    it("allows Parents to edit their own contact details and attorney information on their own/student record", async () => {
      const ownContactUpdate = await parentACaller.contacts.update({
        id: parentAId,
        phone: "(404) 555-9900",
        address: "742 Peachtree St NE",
        city: "Atlanta",
        state: "GA",
        zipCode: "30308",
        attorneyName: "Jordan Blake, Esq.",
        attorneyFirm: "Blake Special Ed Law Group",
        attorneyPhone: "(404) 555-3322",
        attorneyEmail: "jblake@blakelaw.example.com",
        attorneyAddress: "100 Midtown Pkwy Suite 400, Atlanta GA",
      });
      expect(ownContactUpdate).toBeDefined();

      const studentAttorneyUpdate = await parentACaller.contacts.update({
        id: studentAId,
        attorneyName: "Jordan Blake, Esq.",
        attorneyFirm: "Blake Special Ed Law Group",
        attorneyPhone: "(404) 555-3322",
        attorneyEmail: "jblake@blakelaw.example.com",
      });
      expect(studentAttorneyUpdate).toBeDefined();
    });

    it("blocks Parents from editing another family's attorney/contact details or any protected student/billing fields", async () => {
      // Cannot edit Family B's attorney info
      await expect(
        parentACaller.contacts.update({
          id: parentBId,
          attorneyName: "Cross-Family Tamper",
        })
      ).rejects.toThrow(/permission|FORBIDDEN/i);

      // Cannot edit own student's protected educational/medical fields via contacts.update
      await expect(
        parentACaller.contacts.update({
          id: studentAId,
          schoolName: "Parent Self-Edited School",
        })
      ).rejects.toThrow(/Parent accounts are not authorized to modify restricted field/i);

      await expect(
        parentACaller.contacts.update({
          id: studentAId,
          iepEligibility: "Self-Approved",
        })
      ).rejects.toThrow(/Parent accounts are not authorized to modify restricted field/i);

      // Cannot edit own billing/plan fields via contacts.update
      await expect(
        parentACaller.contacts.update({
          id: parentAId,
          planTier: "Complimentary",
          billingStatus: "Paid",
        })
      ).rejects.toThrow(/Parent accounts are not authorized to modify restricted field/i);
    });
  });

  describe("4. Document Access, Vault Fail-Closed & Storage Proxy Protection", () => {
    const parentACaller = appRouter.createCaller(
      makeParentCtx(parentAId, "eleanor.stage1@example.com", "Eleanor Harrison")
    );
    const wyattCaller = appRouter.createCaller(
      makeStaffCtx({
        id: 9060250,
        openId: "user_3KPhcRBro_wyatt",
        name: "Wyatt Smith",
        email: "wyatt.smith@waypointadvocates.com",
      })
    );

    it("enforces ownership on iep.getStudentIepDemographics, clientFiles.confirmCurrentIep, and dismissPossibleNewIep", async () => {
      // Parent A can read own student IEP demographics
      const ownDemo = await parentACaller.iep.getStudentIepDemographics({
        contactId: studentAId,
      });
      expect(ownDemo === null || typeof ownDemo === "object").toBe(true);

      // Parent A is blocked from Family B's student IEP demographics
      await expect(
        parentACaller.iep.getStudentIepDemographics({
          contactId: studentBId,
        })
      ).rejects.toThrow(/permission/i);

      // Wyatt (Call Center) is blocked from IEP demographics ('files' case access is 'none')
      await expect(
        wyattCaller.iep.getStudentIepDemographics({
          contactId: studentAId,
        })
      ).rejects.toThrow(/restricted/i);

      // Parent A cannot confirm or dismiss Family B's IEP even if passing own studentId with Family B's fileId/familyId
      await expect(
        parentACaller.clientFiles.confirmCurrentIep({
          studentId: studentAId,
          fileId: familyBFileId,
          familyId: familyBFamilyId,
          confirmationStatus: "Parent Confirmed",
        })
      ).rejects.toThrow(/permission/i);

      await expect(
        parentACaller.clientFiles.dismissPossibleNewIep({
          studentId: studentAId,
          fileId: familyBFileId,
          familyId: familyBFamilyId,
        })
      ).rejects.toThrow(/permission/i);
    });

    it("enforces authentication and ownership on Express /storage/* and /api/files/* handlers", async () => {
      const prevEnv = process.env.DISABLE_DEV_AUTH_FALLBACK;
      process.env.DISABLE_DEV_AUTH_FALLBACK = "true";
      try {
        // 1. Unauthenticated download attempt -> 401
        const anonStorageRes = await authorizeStorageKeyAccess(
          { headers: {} },
          {},
          "client-files/98820/chloe-iep.pdf"
        );
        expect(anonStorageRes.status).toBe(401);

        // 2. Parent A attempting to download Family B's document -> 403
        const parentACtx = makeParentCtx(parentAId, "eleanor.stage1@example.com", "Eleanor Harrison");
        const crossFamilyStorageRes = await authorizeStorageKeyAccess(
          { headers: {}, user: parentACtx.user },
          {},
          "client-files/98820/chloe-iep.pdf"
        );
        expect(crossFamilyStorageRes.status).toBe(403);

        // 3. Parent A downloading own Family A document -> 200
        const ownStorageRes = await authorizeStorageKeyAccess(
          { headers: {}, user: parentACtx.user },
          {},
          "client-files/98810/lucas-iep.pdf"
        );
        expect(ownStorageRes.status).toBe(200);

        // 4. Call Center (Wyatt) attempting to download case document -> 403 ('files' is 'none')
        const wyattCtx = makeStaffCtx({
          id: 9060250,
          openId: "user_3KPhcRBro_wyatt",
          name: "Wyatt Smith",
          email: "wyatt.smith@waypointadvocates.com",
        });
        const wyattStorageRes = await authorizeStorageKeyAccess(
          { headers: {}, user: wyattCtx.user },
          {},
          "client-files/98810/lucas-iep.pdf"
        );
        expect(wyattStorageRes.status).toBe(403);

        // 5. Unauthenticated upload confirm attempt -> 401
        const anonUploadRes = await authorizeFileUploadRequest(
          { headers: {} },
          {},
          { targetContactId: parentAId, requireTargetOwnershipForClient: true }
        );
        expect(anonUploadRes.status).toBe(401);

        // 6. Parent A attempting to upload/confirm file into Family B's account -> 403
        const crossUploadRes = await authorizeFileUploadRequest(
          { headers: {}, user: parentACtx.user },
          {},
          { targetContactId: parentBId, requireTargetOwnershipForClient: true }
        );
        expect(crossUploadRes.status).toBe(403);
      } finally {
        process.env.DISABLE_DEV_AUTH_FALLBACK = prevEnv;
      }
    });
  });

  describe("5. Protected Owners (9060114, 9060115) & Kyle (9060249) Approved Access Preserved", () => {
    const byron1Caller = appRouter.createCaller(
      makeStaffCtx({
        id: 9060114,
        openId: "user_3HamsO4oLoKLKOnDi9BR16e6RZW",
        name: "Byron Honea",
        email: "byron@waypointadvocates.com",
        role: "admin",
      })
    );
    const byron2Caller = appRouter.createCaller(
      makeStaffCtx({
        id: 9060115,
        openId: "user_3HEhAHIdXNwvbiK5NSR6RPkTInD",
        name: "Byron Honea",
        email: "clientcare@waypointadvocates.com",
        role: "admin",
      })
    );
    const kyleCaller = appRouter.createCaller(
      makeStaffCtx({
        id: 9060249,
        openId: "user_3HELy6EVi_kyle_atkins",
        name: "Kyle Atkins",
        email: "kyle@waypointadvocates.com",
        role: "admin",
      })
    );

    it("preserves full administrative access for both Protected Owners and Kyle Atkins", async () => {
      const b1Access = await byron1Caller.team.getMyStaffAccess();
      expect(b1Access.isProtectedOwner).toBe(true);
      expect(b1Access.hasAdminAccess).toBe(true);

      const b2Access = await byron2Caller.team.getMyStaffAccess();
      expect(b2Access.isProtectedOwner).toBe(true);
      expect(b2Access.hasAdminAccess).toBe(true);

      const kyleAccess = await kyleCaller.team.getMyStaffAccess();
      expect(kyleAccess.isProtectedOwner).toBe(false);
      expect(kyleAccess.hasAdminAccess).toBe(true);
      expect(kyleAccess.primaryRole).toBe("technology");

      // Owners can update student & billing fields without restriction
      const ownerStudentUpdate = await byron1Caller.contacts.update({
        id: studentAId,
        schoolName: "Peachtree Elementary School",
        planTier: "$105",
      });
      expect(ownerStudentUpdate).toBeDefined();
    });
  });
});
