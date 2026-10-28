import { describe, it, expect, beforeEach } from "vitest";
import * as db from "./db";
import { generateCaseCompassAiUpdate, generateAndSaveCompassDraftFromMeeting } from "./compassAi";

describe("Case Compass Data & AI Integration", () => {
  const testStudentId = 99991;
  const testCaseId = "CASE-99991";

  beforeEach(async () => {
    // Clean initial state
  });

  it("1. publishes initial compass with version 1 and 5 standard fields", async () => {
    const published = await db.approveAndPublishCaseCompass({
      caseId: testCaseId,
      studentId: testStudentId,
      currentStatus: "Initial comprehensive evaluation requested from school district.",
      nextStep: "Transmit formal 60-day evaluation request with consent.",
      whoHasBall: "Waypoint Advocate",
      ideaRiskLevel: "Moderate",
      approvedBy: "Byron Honea",
      sourceType: "manual",
      sourceDocument: "Intake Review",
    });

    expect(published).toBeDefined();
    expect(published.caseId).toBe(testCaseId);
    expect(published.studentId).toBe(testStudentId);
    expect(published.version).toBe(1);
    expect(published.currentStatus).toContain("comprehensive evaluation");
    expect(published.nextStep).toContain("60-day evaluation request");
    expect(published.whoHasBall).toBe("Waypoint Advocate");
    expect(published.ideaRiskLevel).toBe("Moderate");
    expect(published.approvedBy).toBe("Byron Honea");
  });

  it("2. increments version and preserves previous version in immutable history snapshot", async () => {
    // Publish update (version 2)
    const updateV2 = await db.approveAndPublishCaseCompass({
      caseId: testCaseId,
      studentId: testStudentId,
      currentStatus: "District issued consent form; 60-day evaluation timeline active.",
      nextStep: "Schedule clinical observation and review psychological rating scales.",
      whoHasBall: "School Psychologist",
      ideaRiskLevel: "Low",
      approvedBy: "Lead Special Education Advocate",
      sourceType: "manual",
      sourceDocument: "Consent Signed Form",
    });

    expect(updateV2.version).toBe(2);
    expect(updateV2.currentStatus).toContain("District issued consent form");
    expect(updateV2.ideaRiskLevel).toBe("Low");

    // Check history snapshots
    const history = await db.getCaseCompassHistory(testCaseId, testStudentId);
    expect(history.length).toBeGreaterThanOrEqual(1);

    const snapshotV1 = history.find((h) => h.version === 1);
    expect(snapshotV1).toBeDefined();
    expect(snapshotV1?.currentStatus).toContain("Initial comprehensive evaluation");
    expect(snapshotV1?.approvedBy).toBe("Byron Honea");
    expect(snapshotV1?.ideaRiskLevel).toBe("Moderate");
  });

  it("3. creates reviewable draft and deduplicates multiple runs for the same meeting", async () => {
    const meetingId = "MEET-IEP-2026-001";

    const draft1 = await generateAndSaveCompassDraftFromMeeting({
      studentId: testStudentId,
      caseId: testCaseId,
      meetingId,
      meetingTitle: "Annual IEP Review & OT Service Dispute",
      transcriptText:
        "Advocate Byron Honea: The district has denied the requested 60 minutes of direct Occupational Therapy. Parent: We strongly disagree because regression was documented. District: We can only offer 15 minutes of consultation. Advocate: We are requesting an IEE and prior written notice.",
    });

    expect(draft1).toBeDefined();
    expect(draft1.status).toBe("pending");
    expect(draft1.meetingId).toBe(meetingId);
    expect(draft1.ideaRiskLevel).toBe("Elevated"); // detected denial of OT & IEE request

    // Second run with same meetingId should deduplicate and return existing draft
    const draft2 = await generateAndSaveCompassDraftFromMeeting({
      studentId: testStudentId,
      caseId: testCaseId,
      meetingId,
      meetingTitle: "Annual IEP Review & OT Service Dispute",
      transcriptText: "Duplicate event trigger",
    });

    expect(draft2.id).toBe(draft1.id);
  });

  it("4. rejects draft cleanly without altering approved compass", async () => {
    const tempMeetingId = "MEET-REJECT-TEST";
    const draft = await generateAndSaveCompassDraftFromMeeting({
      studentId: testStudentId,
      caseId: testCaseId,
      meetingId: tempMeetingId,
      transcriptText: "Discussion without new action items.",
    });

    const rejected = await db.rejectCaseCompassDraft(draft.id, "Lead Special Education Advocate");
    expect(rejected).toBeDefined();
    expect(rejected.status).toBe("rejected");

    // The approved compass remains on version 2
    const current = await db.getCaseCompass(testCaseId, testStudentId);
    expect(current?.version).toBe(2);
  });

  it("5. retains unresolved issues memory between updates", async () => {
    const aiOutput = await generateCaseCompassAiUpdate({
      studentId: testStudentId,
      caseId: testCaseId,
      transcriptText:
        "We resolved the speech therapy scheduling, but the district still refuses the 1-on-1 paraprofessional and has not completed the sensory diet accommodation.",
    });

    expect(aiOutput).toBeDefined();
    expect(aiOutput.currentStatus).toBeDefined();
    expect(aiOutput.nextStep).toBeDefined();
    expect(aiOutput.whoHasBall).toBeDefined();
    expect(["Low", "Moderate", "Elevated", "Urgent"]).toContain(aiOutput.ideaRiskLevel);

    // Unresolved issue tracking
    expect(aiOutput.unresolvedIssues.length).toBeGreaterThan(0);
    const issuesCombined = aiOutput.unresolvedIssues.join(" ").toLowerCase();
    expect(issuesCombined.includes("paraprofessional") || issuesCombined.includes("sensory")).toBe(true);
  });

  it("6. strictly adheres to Rule F: Zero occurrences of prohibited terms", async () => {
    const aiResult = await generateCaseCompassAiUpdate({
      studentId: testStudentId,
      caseId: testCaseId,
      transcriptText: "IEP meeting notes for advocacy planning.",
    });

    const fullText = JSON.stringify(aiResult);
    expect(fullText).not.toMatch(/master coach/i);
    expect(fullText).not.toMatch(/master iep coach/i);
    expect(fullText).not.toMatch(/master coaching/i);
  });

  it("7. retrieves available meeting transcripts from First Mate and Meeting Workspace", async () => {
    // Record a mock First Mate session run
    const { firstMateSessionStore } = await import("./firstMate/sessionStore");
    const testSessionId = `test-sess-${Date.now()}`;
    firstMateSessionStore.recordRun({
      sessionId: testSessionId,
      sessionType: "IEP_MEETING",
      mode: "LIVE",
      title: "Annual IEP Review & OT Dispute",
      studentContactId: testStudentId,
      studentName: "Test Student",
      durationSeconds: 2400,
      transcript: [
        { speakerRole: "Advocate", text: "We are reviewing occupational therapy accommodations." },
        { speakerRole: "Parent", text: "The sensory breaks have not been honored." },
        { speakerRole: "District", text: "We will revise the sensory schedule." },
      ],
      transcriptJson: JSON.stringify([
        { speakerRole: "Advocate", text: "We are reviewing occupational therapy accommodations." },
        { speakerRole: "Parent", text: "The sensory breaks have not been honored." },
        { speakerRole: "District", text: "We will revise the sensory schedule." },
      ]),
      summary: "District agreed to revise the sensory schedule after parent and advocate documented missed accommodations.",
    } as any);

    const result = await db.getAvailableCompassTranscripts(testStudentId);
    expect(result).toBeDefined();
    expect(result.connectedServices.firstMate).toBe(true);
    expect(result.connectedServices.meetingWorkspace).toBe(true);
    expect(result.connectedServices.discoveryCalls).toBe(true);
    expect(result.sessions.length).toBeGreaterThanOrEqual(1);

    const foundSession = result.sessions.find((s) => s.id === testSessionId);
    expect(foundSession).toBeDefined();
    expect(foundSession?.source).toBe("first_mate");
    expect(foundSession?.title).toContain("Annual IEP Review");
    expect(foundSession?.turnCount).toBe(3);
    expect(foundSession?.fullTranscriptText).toContain("sensory breaks");
    expect(result.latestSession).toBeDefined();
  });

  it("8. generates Case Compass AI draft referencing a specific meeting transcript ID", async () => {
    const testSessionId = `test-sess-ai-${Date.now()}`;
    const { firstMateSessionStore } = await import("./firstMate/sessionStore");
    firstMateSessionStore.recordRun({
      sessionId: testSessionId,
      sessionType: "504_MEETING",
      mode: "LIVE",
      title: "Section 504 Plan Revision",
      studentContactId: testStudentId,
      durationSeconds: 1800,
      transcript: [
        { speakerRole: "Advocate", text: "We require extra test time and elevator access." },
        { speakerRole: "District", text: "Agreed to 1.5x time and elevator pass effective Monday." },
      ],
      transcriptJson: JSON.stringify([
        { speakerRole: "Advocate", text: "We require extra test time and elevator access." },
        { speakerRole: "District", text: "Agreed to 1.5x time and elevator pass effective Monday." },
      ]),
      summary: "504 Plan accommodations updated with 1.5x extended time and elevator access.",
    } as any);

    const aiResult = await generateCaseCompassAiUpdate({
      studentId: testStudentId,
      caseId: testCaseId,
      meetingId: testSessionId,
      extraInstructions: "Focus on immediate elevator access implementation",
    });

    expect(aiResult).toBeDefined();
    expect(aiResult.currentStatus).toBeDefined();
    expect(aiResult.nextStep).toBeDefined();
    expect(aiResult.whoHasBall).toBeDefined();
    expect(aiResult.sourceReferences.length).toBeGreaterThan(0);
    // Transcript text was resolved from the session run
    expect(aiResult.rationale).toBeDefined();
  });

  it("9. initializes Case Compass from a Discovery Call transcript for Firm Foundation Kickoff", async () => {
    const discoveryTranscript = [
      "=== WAYPOINT ADVOCATES DISCOVERY CALL RECORD ===",
      "Family Story & Student Background: Parent reached out because student was diagnosed with dyslexia and ADHD. School is refusing to evaluate under IDEA, claiming MTSS Tier 2 is sufficient.",
      "Intake Question Notes: Parent has made 2 verbal requests that went unacknowledged. Student is falling 2 grade levels behind in reading fluency.",
      "Advocate Assessment Notes: District is in clear violation of Child Find mandate. Immediate formal 60-day evaluation request required.",
      "Agreed Next Steps: Transmit formal evaluation demand letter and gather all previous private neuropsychological reports.",
    ].join("\n\n");

    const aiResult = await generateCaseCompassAiUpdate({
      studentId: testStudentId,
      caseId: testCaseId,
      transcriptText: discoveryTranscript,
      extraInstructions: "Kickoff Case Compass with firm foundation based on discovery call",
    });

    expect(aiResult).toBeDefined();
    expect(aiResult.currentStatus.length).toBeGreaterThan(15);
    expect(aiResult.nextStep.length).toBeGreaterThan(15);
    expect(aiResult.whoHasBall.length).toBeGreaterThan(3);
    expect(["Low", "Moderate", "Elevated", "Urgent"]).toContain(aiResult.ideaRiskLevel);
    expect(aiResult.rationale).toBeDefined();
  });
});

