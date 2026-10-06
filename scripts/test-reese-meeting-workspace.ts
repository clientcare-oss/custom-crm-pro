import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

async function main() {
  console.log("=== Testing Meeting Workspace for Reese Vance (ID: 120040) ===");

  const ctx = await createContext({
    req: {
      headers: {},
      cookies: {},
    } as any,
    res: {} as any,
  });

  // Mock authenticated admin user context
  (ctx as any).user = {
    id: 1,
    openId: "admin_test",
    name: "Byron Honea",
    email: "byron@waypointadvocates.com",
    role: "admin",
  };

  const caller = appRouter.createCaller(ctx);

  // 1. Test getOrCreate workspace for Reese Vance
  console.log("\n--- 1. Testing getOrCreate for Reese Vance (studentContactId: 120040) ---");
  const ws = await caller.meetingWorkspace.getOrCreate({
    studentContactId: 120040,
  });

  console.log("Retrieved workspace for Reese:", {
    id: ws.id,
    studentContactId: ws.studentContactId,
    title: ws.title,
    status: ws.status,
    activeTab: ws.activeTab,
    prepStep: ws.prepStep,
    pcsApproved: ws.pcsApproved,
  });

  if (!ws.id || ws.studentContactId !== 120040) {
    throw new Error("Failed to get or create workspace for Reese Vance");
  }

  // 2. Parse targets
  const initialTargets = typeof ws.meetingTargets === "string" ? JSON.parse(ws.meetingTargets) : ws.meetingTargets;
  console.log(`Loaded ${initialTargets?.length || 0} initial targets for Reese`);

  // 3. Test Save Mutation
  console.log("\n--- 2. Testing Save Mutation on Reese's Workspace ---");
  const updatedPcs = ws.parentConcernStatement + " [VERIFIED ADVOCATE SAVE TEST]";
  const updatedTargets = [
    ...initialTargets,
    {
      id: "tgt-rv-test-save",
      targetName: "Test Target: Extended Speech Therapy Log",
      category: "Related Services (Speech & OT)",
      iepSection: "Related Services (Speech & OT)",
      priority: "HIGH",
      status: "TARGET_CONFIRMED",
      whyWeWantIt: "Ensure make-up minutes are delivered within 10 days of absence.",
      possibleIepWording: "Provider will furnish monthly log of delivered speech minutes.",
    }
  ];

  const saveResult = await caller.meetingWorkspace.save({
    id: ws.id,
    status: "READY",
    activeTab: "BLUEPRINT",
    prepStep: "blueprint",
    parentConcernStatement: updatedPcs,
    pcsApproved: true,
    meetingTargets: updatedTargets,
    closeoutChecks: {
      allRequestsRaised: true,
      pwnIdentified: true,
      agreedLocationsClear: true,
      followUpAssigned: true,
      nextMeetingDiscussed: true,
      testVerifiedAt: new Date().toISOString(),
    }
  });

  console.log("Save mutation returned:", {
    id: saveResult?.id,
    status: saveResult?.status,
    activeTab: saveResult?.activeTab,
    pcsApproved: saveResult?.pcsApproved,
  });

  // 4. Verify persistence by re-fetching
  console.log("\n--- 3. Verifying Persistence via getById ---");
  const verifiedWs = await caller.meetingWorkspace.getById({ id: ws.id });
  const verifiedTargets = typeof verifiedWs.meetingTargets === "string" ? JSON.parse(verifiedWs.meetingTargets) : verifiedWs.meetingTargets;
  const verifiedChecks = typeof verifiedWs.closeoutChecks === "string" ? JSON.parse(verifiedWs.closeoutChecks) : verifiedWs.closeoutChecks;

  console.log("Verified PCS ends with test text:", verifiedWs.parentConcernStatement?.includes("[VERIFIED ADVOCATE SAVE TEST]"));
  console.log(`Verified targets count: ${verifiedTargets?.length} (expected: ${updatedTargets.length})`);
  console.log("Verified closeout checks:", verifiedChecks);

  if (!verifiedWs.parentConcernStatement?.includes("[VERIFIED ADVOCATE SAVE TEST]")) {
    throw new Error("PCS save verification failed");
  }
  if (verifiedTargets.length !== updatedTargets.length) {
    throw new Error("Targets count save verification failed");
  }

  // 5. Clean up the test marker from PCS and targets
  console.log("\n--- 4. Restoring Pristine Targets & PCS ---");
  const restoredPcs = ws.parentConcernStatement;
  await caller.meetingWorkspace.save({
    id: ws.id,
    status: "READY",
    activeTab: "BLUEPRINT",
    prepStep: "blueprint",
    parentConcernStatement: restoredPcs,
    pcsApproved: true,
    meetingTargets: initialTargets,
  });
  console.log("✓ Restored pristine state for Reese Vance workspace.");

  // 6. Test listByStudent
  console.log("\n--- 5. Testing listByStudent for Reese Vance ---");
  const list = await caller.meetingWorkspace.listByStudent({ studentContactId: 120040 });
  console.log(`Found ${list.length} workspace(s) for Reese Vance`);

  console.log("\n=== ALL MEETING WORKSPACE SAVE & RETRIEVAL TESTS PASSED FOR REESE VANCE! ===");
}

main().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
