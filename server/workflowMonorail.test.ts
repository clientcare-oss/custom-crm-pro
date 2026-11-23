import { describe, it, expect, beforeEach } from "vitest";
import {
  buildSampleStarterWorkflowDocument,
  buildWorkflowDocumentFromPipelineStages,
  computeMonorailGeometry,
  evaluateTransitionApprovalGates,
  getRailPieceGeometry,
  isApplicableToScope,
  parseWorkflowCanvasData,
  serializeWorkflowDocument,
  syncStagesFromTraditional,
  syncTraditionalFromStages,
  type MonorailCosmeticPiece,
} from "../shared/workflowModel";
import {
  buildCanvasSockets,
  explainInvalidConnection,
  isPieceCompatibleWithSocket,
  translateAttachedRailPieces,
} from "../client/src/components/workflows/monorailSnapEngine";
import {
  __resetWorkflowProgressTestState,
  __seedWorkflowForTest,
  advanceCaseStageWithGates,
  getCaseWorkflowProgress,
  setCaseGuideStepCompletion,
  submitCaseGateApproval,
} from "./db/workflows";
import { DEFAULT_PIPELINE_STAGES } from "./db/pipeline";
import type { StaffAccessProfile } from "./_core/staffAccess";

const ADVOCATE_PROFILE: StaffAccessProfile = {
  userId: 101,
  openId: "adv-101",
  employeeId: "emp-adv",
  name: "Sarah Jenkins",
  email: "sarah@waypointadvocates.com",
  primaryRole: "advocate",
  additionalRoles: [],
  isProtectedOwner: false,
  hasAdminAccess: false,
  isStaff: true,
  accountStatus: "active",
  modulePermissions: { workflows: "view" },
  caseWorkspaceAccess: {},
  permissionOverrides: {},
};

const CALL_CENTER_PROFILE: StaffAccessProfile = {
  ...ADVOCATE_PROFILE,
  userId: 102,
  openId: "cc-102",
  name: "Intake Coordinator",
  primaryRole: "call_center",
};

describe("Workflow Designer — Unified Traditional & Monorail Model", () => {
  beforeEach(() => {
    __resetWorkflowProgressTestState();
  });

  it("loads legacy Traditional { nodes, edges } workflows without data loss", () => {
    const legacyJson = JSON.stringify({
      nodes: [
        { id: "n1", type: "card", position: { x: 100, y: 100 }, data: { label: "New Lead", notes: "Intake", color: "#3b82f6" } },
        { id: "d1", type: "diamond", position: { x: 250, y: 180 }, data: { label: "Advocate approval", color: "#ef4444" } },
        { id: "n2", type: "card", position: { x: 400, y: 100 }, data: { label: "Records Review", notes: "Audit IEP", color: "#10b981" } },
        { id: "s1", type: "sticky", position: { x: 60, y: 260 }, data: { label: "Keep parent note", color: "#f59e0b" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "d1" },
        { id: "e2", source: "d1", target: "n2" },
      ],
    });

    const doc = parseWorkflowCanvasData(legacyJson);
    expect(doc.schemaVersion).toBe(2);
    expect(doc.stages.map((s) => s.id)).toEqual(["n1", "n2"]);
    expect(doc.stages[0].name).toBe("New Lead");
    expect(doc.stages[1].name).toBe("Records Review");
    expect(doc.approvalGates).toHaveLength(1);
    expect(doc.approvalGates[0]).toMatchObject({
      id: "d1",
      fromStageId: "n1",
      toStageId: "n2",
      title: "Advocate approval",
    });
    // Sticky note preserved intact in Traditional nodes
    expect(doc.nodes.some((n) => n.id === "s1" && n.type === "sticky")).toBe(true);
  });

  it("keeps stage renames synchronized bidirectionally between Monorail and Traditional by stable ID", () => {
    const doc = buildWorkflowDocumentFromPipelineStages(DEFAULT_PIPELINE_STAGES.slice(0, 4));
    const targetStageId = doc.stages[1].id;

    // 1. Rename in Monorail -> verify Traditional node updates by stable ID
    const renamedInMonorail = {
      ...doc,
      stages: doc.stages.map((s) =>
        s.id === targetStageId ? { ...s, name: "Discovery Strategy" } : s
      ),
    };
    const syncedTraditional = syncTraditionalFromStages(
      renamedInMonorail.stages,
      renamedInMonorail.approvalGates,
      renamedInMonorail.nodes,
      renamedInMonorail.edges
    );
    const matchingNode = syncedTraditional.nodes.find((n) => n.id === targetStageId);
    expect(matchingNode?.data.label).toBe("Discovery Strategy");

    // 2. Rename back in Traditional -> verify Monorail stage updates AND preserves guideSteps
    const originalGuideCount = renamedInMonorail.stages[1].guideSteps.length;
    const editedNodes = syncedTraditional.nodes.map((n) =>
      n.id === targetStageId ? { ...n, data: { ...n.data, label: "Consultation & Intake" } } : n
    );
    const syncedBack = syncStagesFromTraditional(
      { ...renamedInMonorail, nodes: syncedTraditional.nodes, edges: syncedTraditional.edges },
      editedNodes,
      syncedTraditional.edges
    );
    const syncedStage = syncedBack.stages.find((s) => s.id === targetStageId);
    expect(syncedStage?.name).toBe("Consultation & Intake");
    expect(syncedStage?.guideSteps.length).toBe(originalGuideCount);
  });

  it("keeps visual Monorail layout separate from business workflow sequence", () => {
    const doc = buildWorkflowDocumentFromPipelineStages(DEFAULT_PIPELINE_STAGES.slice(0, 6));
    const originalOrder = doc.stages.map((s) => s.id);
    const movedId = doc.stages[0].id;

    const movedDoc = {
      ...doc,
      monorailLayout: { [movedId]: { x: 890, y: 540 } },
    };

    // Business order MUST NOT change
    expect(movedDoc.stages.map((s) => s.id)).toEqual(originalOrder);

    // Visual station coordinates reflect the override while staying connected
    const geo = computeMonorailGeometry(movedDoc.stages, movedDoc.monorailLayout);
    expect(geo.stationMap[movedId].x).toBe(890);
    expect(geo.stationMap[movedId].y).toBe(540);
    expect(geo.segmentPaths[0].d).toContain("M 890 540");
  });

  it("handles empty, single-stage, and long workflows cleanly in serpentine geometry", () => {
    const emptyGeo = computeMonorailGeometry([]);
    expect(emptyGeo.stations).toHaveLength(0);
    expect(emptyGeo.mainPathD).toBe("");

    const singleDoc = buildWorkflowDocumentFromPipelineStages(DEFAULT_PIPELINE_STAGES.slice(0, 1));
    const singleGeo = computeMonorailGeometry(singleDoc.stages);
    expect(singleGeo.stations).toHaveLength(1);
    expect(singleGeo.segmentPaths).toHaveLength(0);

    const fullDoc = buildWorkflowDocumentFromPipelineStages(DEFAULT_PIPELINE_STAGES);
    const fullGeo = computeMonorailGeometry(fullDoc.stages);
    expect(fullGeo.stations).toHaveLength(DEFAULT_PIPELINE_STAGES.length);
    expect(fullGeo.segmentPaths).toHaveLength(DEFAULT_PIPELINE_STAGES.length - 1);
  });

  it("filters plan and project applicability accurately without altering data", () => {
    const universal = { applicablePlans: [], applicableProjectTypes: [] };
    const anchorComplaint = {
      applicablePlans: ["anchor"],
      applicableProjectTypes: ["State Complaint"],
    };

    expect(isApplicableToScope(universal, "navigator", "IEP Meeting")).toBe(true);
    expect(isApplicableToScope(anchorComplaint, "anchor", "State Complaint")).toBe(true);
    expect(isApplicableToScope(anchorComplaint, "navigator", "State Complaint")).toBe(false);
    expect(isApplicableToScope(anchorComplaint, "anchor", "IEP Meeting")).toBe(false);
    expect(isApplicableToScope(anchorComplaint, "all", "all")).toBe(true);
  });

  it("enforces Approval Gates on the backend — blocks unauthorized roles and incomplete steps, allows once satisfied", async () => {
    const doc = buildWorkflowDocumentFromPipelineStages(DEFAULT_PIPELINE_STAGES);
    const gate = doc.approvalGates[0];
    expect(gate).toBeDefined();

    __seedWorkflowForTest({
      id: 901,
      title: "Live Advocacy Journey",
      canvasData: serializeWorkflowDocument(doc),
    });

    const contactId = 55501;

    // 1. Attempting to advance BEFORE required steps & gate approval MUST be blocked
    const blockedInitial = await advanceCaseStageWithGates({
      workflowId: 901,
      contactId,
      fromStageId: gate.fromStageId,
      targetStageId: gate.toStageId,
      actorName: "Sarah Jenkins",
      actorRole: "advocate",
    });
    expect(blockedInitial.allowed).toBe(false);
    expect(blockedInitial.blockingReasons.length).toBeGreaterThan(0);

    // 2. Unauthorized role (call_center) CANNOT approve a Lead Advocate gate
    const wrongRoleRes = await submitCaseGateApproval({
      workflowId: 901,
      contactId,
      gateId: gate.id,
      status: "approved",
      actorName: "Intake Staff",
      actorRole: "call_center",
      staffAccess: CALL_CENTER_PROFILE,
    });
    expect(wrongRoleRes.success).toBe(false);
    expect(wrongRoleRes.error).toContain("not authorized");

    // 3. Even an authorized advocate CANNOT approve gate before required steps are complete
    const missingStepsRes = await submitCaseGateApproval({
      workflowId: 901,
      contactId,
      gateId: gate.id,
      status: "approved",
      actorName: "Sarah Jenkins",
      actorRole: "advocate",
      staffAccess: ADVOCATE_PROFILE,
    });
    expect(missingStepsRes.success).toBe(false);
    expect(missingStepsRes.error).toContain("Complete required guide steps");

    // 4. Complete all required guide steps for the source stage
    for (const stepId of gate.requiredStepIds) {
      await setCaseGuideStepCompletion({
        workflowId: 901,
        contactId,
        stageId: gate.fromStageId,
        stepId,
        completed: true,
        actorName: "Sarah Jenkins",
      });
    }

    // Still blocked until gate sign-off is submitted!
    const evalBeforeSignoff = evaluateTransitionApprovalGates({
      doc,
      fromStageId: gate.fromStageId,
      toStageId: gate.toStageId,
      completedStepIds: new Set(gate.requiredStepIds),
      approvedGateIds: new Set(),
    });
    expect(evalBeforeSignoff.allowed).toBe(false);
    expect(evalBeforeSignoff.blockingGates[0].needsRoleSignOff).toBe(true);

    // 5. Authorized advocate approves gate
    const approvedRes = await submitCaseGateApproval({
      workflowId: 901,
      contactId,
      gateId: gate.id,
      status: "approved",
      note: "All IEP records and findings verified.",
      actorName: "Sarah Jenkins",
      actorRole: "advocate",
      staffAccess: ADVOCATE_PROFILE,
    });
    expect(approvedRes.success).toBe(true);

    // 6. Now advancing the case succeeds!
    const allowedAdvance = await advanceCaseStageWithGates({
      workflowId: 901,
      contactId,
      fromStageId: gate.fromStageId,
      targetStageId: gate.toStageId,
      actorName: "Sarah Jenkins",
      actorRole: "advocate",
    });
    expect(allowedAdvance.allowed).toBe(true);
    expect(allowedAdvance.blockingReasons).toEqual([]);

    // 7. Editing the reusable workflow definition NEVER resets saved case progress!
    const editedDoc = {
      ...doc,
      definitionVersion: 2,
      stages: doc.stages.map((s) =>
        s.id === gate.fromStageId ? { ...s, name: "Records Review (Updated)" } : s
      ),
    };
    __seedWorkflowForTest({
      id: 901,
      title: "Live Advocacy Journey",
      canvasData: serializeWorkflowDocument(editedDoc),
    });
    const preservedProgress = await getCaseWorkflowProgress(901, contactId);
    expect(preservedProgress.steps.filter((s) => s.completed).length).toBe(
      gate.requiredStepIds.length
    );
    expect(preservedProgress.gates.find((g) => g.gateId === gate.id)?.status).toBe("approved");
  });

  it("builds a complete 9-station starter monorail preview without overwriting user workflows", () => {
    const starter = buildSampleStarterWorkflowDocument();
    expect(starter.stages).toHaveLength(9);
    expect(starter.stages.map((s) => s.name)).toEqual([
      "New Lead",
      "Discovery",
      "Onboarding",
      "Records Review",
      "Blueprint",
      "Meeting",
      "Parent Update",
      "Follow-Up",
      "Ongoing Support",
    ]);
    const records = starter.stages.find((s) => s.name === "Records Review");
    const onboarding = starter.stages.find((s) => s.name === "Onboarding");
    expect(records?.guideSteps.length).toBeGreaterThanOrEqual(3);
    expect(onboarding?.automations.length).toBeGreaterThanOrEqual(3);
    expect(starter.approvalGates).toHaveLength(1);
    expect(starter.nodes.filter((n) => n.type === "card")).toHaveLength(9);
  });

  it("persists cosmetic rail pieces & visual prefs separately from workflow rules and validates snap sockets", () => {
    const doc = buildSampleStarterWorkflowDocument();
    const pieceA: MonorailCosmeticPiece = {
      id: "pc-1",
      kind: "quarter_turn",
      routeType: "main",
      x: 420,
      y: 120,
      rotationDeg: 0,
      attachedTo: { targetType: "station", targetId: doc.stages[0].id, socketName: "out" },
    };
    const pieceB: MonorailCosmeticPiece = {
      id: "pc-2",
      kind: "straight",
      routeType: "main",
      x: 516,
      y: 216,
      rotationDeg: 90,
      attachedTo: { targetType: "piece", targetId: "pc-1", socketName: "out" },
    };

    const withPieces = {
      ...doc,
      monorailRailPieces: [pieceA, pieceB],
      monorailVisualPrefs: {
        expandedGuideStageIds: [doc.stages[3].id],
        expandedAutomationStageIds: [doc.stages[2].id],
      },
    };
    const roundTripped = parseWorkflowCanvasData(serializeWorkflowDocument(withPieces));
    expect(roundTripped.monorailRailPieces).toHaveLength(2);
    expect(roundTripped.monorailVisualPrefs?.expandedAutomationStageIds).toEqual([doc.stages[2].id]);
    expect(roundTripped.stages.map((s) => s.id)).toEqual(doc.stages.map((s) => s.id));

    // Geometry sockets + compatibility + invalid connection rejection
    const geo = computeMonorailGeometry(roundTripped.stages, roundTripped.monorailLayout, {
      railPieces: roundTripped.monorailRailPieces,
    });
    expect(geo.bounds.maxX).toBeGreaterThan(geo.bounds.minX);
    const sockets = buildCanvasSockets(roundTripped.stages, geo, roundTripped.monorailRailPieces || []);
    const guideSocket = sockets.find((s) => s.accepts === "guide")!;
    const autoSocket = sockets.find((s) => s.accepts === "automation")!;
    const segSocket = sockets.find((s) => s.accepts === "gate_or_station")!;
    const railSocket = sockets.find((s) => s.accepts === "rail")!;

    expect(isPieceCompatibleWithSocket("guide_step", guideSocket)).toBe(true);
    expect(isPieceCompatibleWithSocket("guide_step", autoSocket)).toBe(false);
    expect(isPieceCompatibleWithSocket("approval_gate", segSocket)).toBe(true);
    expect(isPieceCompatibleWithSocket("approval_gate", guideSocket)).toBe(false);
    expect(isPieceCompatibleWithSocket("u_turn", railSocket)).toBe(true);
    expect(isPieceCompatibleWithSocket("u_turn", guideSocket)).toBe(false);
    expect(explainInvalidConnection("approval_gate", guideSocket)).toContain("gold transition");

    // Moving parent station keeps transitively attached cosmetic pieces moving together
    const pieceGeo = getRailPieceGeometry(pieceA);
    expect(pieceGeo.worldSockets).toHaveLength(2);
    const shifted = translateAttachedRailPieces([pieceA, pieceB], "station", doc.stages[0].id, 40, -25);
    expect(shifted[0]).toMatchObject({ x: 460, y: 95 });
    expect(shifted[1]).toMatchObject({ x: 556, y: 191 });
  });
});
