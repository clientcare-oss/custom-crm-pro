import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { parseAdvocateReadyDocument } from "./services/advocateReadyParser";
import fs from "fs";
import path from "path";

describe("PG-043 Advocate Ready Import & Persistence Flow", () => {
  const sampleFilePath = path.resolve(process.cwd(), "client/public/Jeremiah_Mitchell_Advocate_Ready.txt");
  let documentContent: string;

  beforeEach(() => {
    documentContent = fs.readFileSync(sampleFilePath, "utf8");
  });

  it("1. Parses Jeremiah Mitchell's 25 targets with exact 1-to-1 linkage and sections", async () => {
    const result = parseAdvocateReadyDocument(documentContent, "Jeremiah_Mitchell_Advocate_Ready.txt");

    expect(result.success).toBe(true);
    expect(result.targets.length).toBe(25);
    expect(result.validationErrors.length).toBe(0);

    // Verify sections and ordering
    expect(result.detectedOrder).toContain("Individualized Education Program (IEP)");
    expect(result.detectedOrder).toContain("Present Levels / Academics");
    expect(result.detectedOrder).toContain("Special Factors");
    expect(result.detectedOrder).toContain("Transition Service Plan");
    expect(result.detectedOrder).toContain("Annual Goals");
    expect(result.detectedOrder).toContain("GAA Participation");
    expect(result.detectedOrder).toContain("Accommodations / Supports");
    expect(result.detectedOrder).toContain("ESY & Transportation");
    expect(result.detectedOrder).toContain("Special Education Services");

    // Verify TARGET-001 content
    const t001 = result.targets.find((t) => t.externalTargetId === "TARGET-001");
    expect(t001).toBeDefined();
    expect(t001?.targetName).toBe("Reevaluation Date");
    expect(t001?.iepSection).toBe("Individualized Education Program (IEP)");
    expect(t001?.quickAdvocateSayThis).toContain("Please verify and correct the most recent eligibility or reevaluation date");
    expect(t001?.putItHereLocation).toContain("IEP identification page");
    expect(t001?.whyWeWantIt).toContain("The identification page lists January 25, 2021");
    expect(t001?.supportingEvidence).toContain("IEP page 1 lists January 25, 2021");
    expect(t001?.ifTeamDisagrees).toContain("Which completed record supports the date on page 1");
    expect(t001?.requestRaised).toBe(false);
    expect(t001?.addedToIep).toBe(false);
    expect(t001?.pwnNeeded).toBe(false);
    expect(t001?.followUpNeeded).toBe(false);

    // Verify TARGET-014 content
    const t014 = result.targets.find((t) => t.externalTargetId === "TARGET-014");
    expect(t014).toBeDefined();
    expect(t014?.targetName).toBe("Math Criterion");
    expect(t014?.iepSection).toBe("Annual Goals");
    expect(t014?.quickAdvocateSayThis).toContain("math participation objective so its mastery count and percentage agree");
    expect(t014?.putItHereLocation).toContain("Measurable Annual Goals, Math, Objective 1");
    expect(t014?.whyWeWantIt).toContain("Three of five is 60%");

    // Verify TARGET-024 content
    const t024 = result.targets.find((t) => t.externalTargetId === "TARGET-024");
    expect(t024).toBeDefined();
    expect(t024?.targetName).toBe("OT Frequency");
    expect(t024?.iepSection).toBe("Special Education Services");
    expect(t024?.quickAdvocateSayThis).toContain("one 15-minute OT session each semester");
    expect(t024?.putItHereLocation).toContain("Special Education Services, Related Services");

    // Verify TARGET-025 content
    const t025 = result.targets.find((t) => t.externalTargetId === "TARGET-025");
    expect(t025).toBeDefined();
    expect(t025?.targetName).toBe("Peer Participation");
    expect(t025?.iepSection).toBe("Special Education Services");
    expect(t025?.quickAdvocateSayThis).toContain("opportunities to participate with nondisabled peers");
  });

  it("2. Executes parseAdvocateReadyImport tRPC procedure via caller and returns unassigned draft metadata", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, name: "Byron Honea", email: "byron@waypointadvocates.com", role: "admin" } as any,
    });

    const parseResponse = await caller.meetingWorkspace.parseAdvocateReadyImport({
      studentContactId: 120034,
      rawContent: documentContent,
      fileName: "Jeremiah_Mitchell_Advocate_Ready.txt",
    });

    expect(parseResponse.success).toBe(true);
    expect(parseResponse.studentContactId).toBe(120034);
    expect(parseResponse.totalTargetsCount).toBe(25);
    expect(parseResponse.targets.length).toBe(25);
    expect(parseResponse.isUnassignedDraft).toBe(true);
    expect(parseResponse.meetingTitle).toBe("Unassigned Draft");
  });

  it("3. Executes saveAdvocateReadyDraft and saves discrete target records without duplicating Jeremiah", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, name: "Byron Honea", email: "byron@waypointadvocates.com", role: "admin" } as any,
    });

    const parseResponse = await caller.meetingWorkspace.parseAdvocateReadyImport({
      studentContactId: 120034,
      rawContent: documentContent,
      fileName: "Jeremiah_Mitchell_Advocate_Ready.txt",
    });

    const saveResponse = await caller.meetingWorkspace.saveAdvocateReadyDraft({
      studentContactId: 120034,
      meetingId: null,
      targets: parseResponse.targets,
      detectedOrder: parseResponse.detectedOrder,
      additionalItems: parseResponse.additionalItems,
      mode: "replace",
    });

    expect(saveResponse.success).toBe(true);
    expect(saveResponse.savedTargetsCount).toBe(25);
    expect(saveResponse.isUnassignedDraft).toBe(true);
  });
});
