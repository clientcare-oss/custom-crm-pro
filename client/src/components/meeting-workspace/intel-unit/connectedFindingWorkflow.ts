import type {
  BlueprintItemDestination,
  BlueprintParentReviewStatus,
  CombinedFindingSourceItem,
  IepIntelFinding,
  MeetingTarget,
  MeetingWorkspaceStatus,
  ParentScriptStyleType,
  TargetTagType,
} from "../types";
import {
  type VaultDocumentOption,
  getCanonicalIepSectionOrder,
} from "./intelUnitTypes";

export type ConnectedFindingStageStatus =
  | "pending"
  | "saved_for_later"
  | "in_blueprint"
  | "on_meeting_agenda"
  | "withdrawn_history"
  | "dismissed";

export function getEffectiveParentReviewStatus(
  target: Pick<MeetingTarget, "parentReviewStatus">
): BlueprintParentReviewStatus {
  return target.parentReviewStatus || "review_with_parent";
}

export function getEffectiveTargetDestination(
  target: Pick<
    MeetingTarget,
    "blueprintDestination" | "tags" | "archivedOrWithdrawn" | "removedFromPlan"
  >
): BlueprintItemDestination {
  if (target.blueprintDestination) {
    return target.blueprintDestination;
  }
  if (target.tags?.includes("PARENT_DOESNT_WANT")) {
    return "parent_doesnt_want";
  }
  if (target.tags?.includes("SKIP")) {
    return "set_aside";
  }
  // Preserve existing final-plan selections for legacy targets created before destination routing was added
  return "final_meeting_plan";
}

export function isTargetIncludedInFinalMeetingPlan(
  target: MeetingTarget | null | undefined
): boolean {
  if (!target) return false;
  if (target.archivedOrWithdrawn || target.removedFromPlan) return false;
  return getEffectiveTargetDestination(target) === "final_meeting_plan";
}

export function setTargetParentReviewStatus(
  target: MeetingTarget,
  parentReviewStatus: BlueprintParentReviewStatus
): MeetingTarget {
  // Deliberate parent-review status update — never auto-changes destination or meeting outcome
  return {
    ...target,
    parentReviewStatus,
  };
}

export function setTargetDestination(
  target: MeetingTarget,
  destination: BlueprintItemDestination,
  parentDoesntWantReason?: string
): MeetingTarget {
  const baseTags: TargetTagType[] = (target.tags || []).filter(
    (tag) => tag !== "PARENT_DOESNT_WANT" && tag !== "SKIP"
  );
  if (destination === "parent_doesnt_want") {
    baseTags.push("PARENT_DOESNT_WANT");
  } else if (destination === "set_aside") {
    baseTags.push("SKIP");
  }

  return {
    ...target,
    blueprintDestination: destination,
    removedFromPlan: false,
    removedFromPlanAt: undefined,
    archivedOrWithdrawn: false,
    tags: baseTags,
    parentDoesntWantReason:
      destination === "parent_doesnt_want"
        ? parentDoesntWantReason !== undefined
          ? parentDoesntWantReason
          : target.parentDoesntWantReason
        : target.parentDoesntWantReason,
  };
}

export function toggleTargetIncludedInFinalMeetingPlan(
  target: MeetingTarget
): MeetingTarget {
  const currentlyIncluded = isTargetIncludedInFinalMeetingPlan(target);
  return setTargetDestination(
    target,
    currentlyIncluded ? "keep_in_blueprint" : "final_meeting_plan"
  );
}

export function removeTargetFromActivePlan(
  target: MeetingTarget
): MeetingTarget {
  return {
    ...target,
    removedFromPlan: true,
    removedFromPlanAt: new Date().toISOString(),
  };
}

export function restoreTargetToActivePlan(
  target: MeetingTarget,
  destination: BlueprintItemDestination = "keep_in_blueprint"
): MeetingTarget {
  return setTargetDestination(
    {
      ...target,
      removedFromPlan: false,
      removedFromPlanAt: undefined,
      archivedOrWithdrawn: false,
      archivedAt: undefined,
      archivedReason: undefined,
    },
    destination
  );
}

// ─── "What to Say to the Parent" Read-Aloud Script Generator & Edit Preservation ───

function replaceUnexplainedJargon(raw: string): string {
  return raw
    .replace(/\bPLAAFP\b/gi, "present levels")
    .replace(/\bPWN\b/gi, "written explanation from the school")
    .replace(/\bFAPE\b/gi, "appropriate support")
    .replace(/\bLRE\b/gi, "classroom setting")
    .replace(/\bFBA\b/gi, "functional behavior assessment")
    .replace(/\bBIP\b/gi, "behavior support plan")
    .replace(/\bESY\b/gi, "extended school year support")
    .replace(/\bSDIs?\b/gi, "specially designed instruction")
    .replace(/\bIEE\b/gi, "independent evaluation")
    .replace(/\bviolates?\b/gi, "may not fully address")
    .replace(/\bviolation\b/gi, "gap")
    .replace(/\bnon-?compliant\b/gi, "incomplete")
    .replace(/\bmust\s+provide\b/gi, "could consider providing")
    .replace(/\bwill\s+guarantee\b/gi, "may help support");
}

function stripOuterQuotesAndPunctuation(text: string): string {
  return text
    .trim()
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .replace(/[.?!]+$/g, "")
    .trim();
}

function lowerFirstUnlessAcronym(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (/^(IEP|OT|PT|SLP|AAC|ADHD|ASD)\b/.test(trimmed)) {
    return trimmed;
  }
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

export function detectWhatToSayToParentStyle(
  target: Partial<MeetingTarget>
): Exclude<ParentScriptStyleType, "auto"> {
  if (
    target.whatToSayToParentStyle &&
    target.whatToSayToParentStyle !== "auto"
  ) {
    return target.whatToSayToParentStyle;
  }

  const section = (target.iepSection || "").toLowerCase();
  const combined = [
    target.targetName,
    target.iepSection,
    target.parentWhatWeFound,
    target.fullAdvocateScript,
    target.parentWhatWeWant,
    target.quickAdvocateSayThis,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    section.includes("goal") ||
    /\b(missing goal|no goal|without a .*goal|does not include a .*goal|doesn't include a .*goal|measurable .*goal|annual goal|reading goal|math goal|writing goal|speech goal|behavior goal)\b/i.test(
      combined
    )
  ) {
    return "missing_goal";
  }

  const requestText = (
    target.parentWhatWeWant ||
    target.quickAdvocateSayThis ||
    ""
  ).trim();

  if (
    /\b(clarif|unclear|isn't clear|is not clear|not clear|explain more clearly|contradict|inconsistent|discrepancy|how often|whether)\b/i.test(
      combined
    ) ||
    (requestText.endsWith("?") &&
      !/\b(accommodation|measurable goal)\b/i.test(requestText))
  ) {
    return "clarification";
  }

  return "accommodation";
}

export function generateWhatToSayToParentScript(
  target: Partial<MeetingTarget>,
  options?: {
    studentName?: string;
    style?: ParentScriptStyleType;
  }
): string {
  const resolvedStyle =
    options?.style && options.style !== "auto"
      ? options.style
      : detectWhatToSayToParentStyle(target);

  const rawStudent = (options?.studentName || "").trim();
  const studentFirst =
    rawStudent &&
    rawStudent.toLowerCase() !== "student" &&
    rawStudent.toLowerCase() !== "your child"
      ? rawStudent.split(/\s+/)[0]
      : "your child";

  const rawFound = replaceUnexplainedJargon(
    stripOuterQuotesAndPunctuation(
      target.parentWhatWeFound ||
        target.fullAdvocateScript ||
        target.supportingEvidence ||
        target.targetName ||
        "an area in the IEP worth reviewing together"
    )
  );

  const rawWhy = replaceUnexplainedJargon(
    stripOuterQuotesAndPunctuation(
      target.parentWhyWeWantIt ||
        target.whyWeWantIt ||
        "have the right day-to-day support in class"
    )
  );

  const rawWant = replaceUnexplainedJargon(
    stripOuterQuotesAndPunctuation(
      target.parentWhatWeWant ||
        target.quickAdvocateSayThis ||
        target.possibleIepWording ||
        target.targetName ||
        "additional support"
    )
  );

  if (resolvedStyle === "missing_goal") {
    // Extract the skill/difficulty from rawFound
    let skillClause = rawFound
      .replace(/^the\s+iep\s+(describes|notes|mentions|shows)\s+/i, "")
      .replace(/^we\s+noticed\s+(that\s+)?(the\s+iep\s+(describes|notes)\s+)?/i, "")
      .replace(
        /,?\s*(but|however|yet)\s+(it\s+)?(does\s+not|doesn't|did\s+not|didn't)\s+(include|have|contain|provide).*$/i,
        ""
      )
      .trim();

    skillClause = lowerFirstUnlessAcronym(skillClause || "this area");
    const describesPart = /^difficulty\s+with\b/i.test(skillClause)
      ? skillClause
      : /\b(difficulties|challenges|needs|delays|struggles|concerns)\b/i.test(
          skillClause
        )
      ? skillClause
      : `difficulty with ${skillClause}`;

    let goalRequestClause = rawWant
      .replace(
        /^(we\s+would\s+like\s+to\s+|we'd\s+like\s+to\s+|ask\s+the\s+(iep\s+)?team\s+(to\s+|about\s+)?|request\s+|add\s+|adding\s+)/i,
        ""
      )
      .trim();
    goalRequestClause = lowerFirstUnlessAcronym(goalRequestClause);

    const addingGoalPhrase =
      goalRequestClause &&
      goalRequestClause.toLowerCase().includes("goal") &&
      goalRequestClause.length <= 120
        ? `adding ${goalRequestClause}`
        : "adding a measurable goal";

    return `We noticed the IEP describes ${describesPart}, but we didn’t find a goal addressing it. We’d like to ask the team about ${addingGoalPhrase} so we can track progress. Is this something you want us to bring up?`;
  }

  if (resolvedStyle === "clarification") {
    let detailClause = rawFound
      .replace(/^the\s+iep\s+(says|states|notes|describes)\s+(that\s+)?/i, "")
      .replace(/^page\s+\d+\s*:\s*/i, "")
      .replace(
        /,?\s*(but|however)\s+it\s+(isn't|is\s+not)\s+clear.*$/i,
        ""
      )
      .trim();
    detailClause = lowerFirstUnlessAcronym(
      detailClause || "how this support is currently delivered"
    );

    let questionClause = rawWant
      .replace(
        /^(can\s+the\s+team\s+(clarify|explain)\s+|we\s+would\s+like\s+to\s+ask\s+(the\s+team\s+)?(to\s+clarify\s+|about\s+)?|ask\s+the\s+team\s+(to\s+clarify\s+|about\s+)?|it\s+(isn't|is\s+not)\s+clear\s+)/i,
        ""
      )
      .trim();
    questionClause = lowerFirstUnlessAcronym(
      questionClause || "how this works day to day in the classroom"
    );

    if (
      !/^(how|when|what|where|who|whether|why|if)\b/i.test(questionClause)
    ) {
      questionClause = `how ${questionClause}`;
    }

    return `We found something we’d like the team to explain more clearly. The IEP says ${detailClause}, but it isn’t clear ${questionClause}. We’d like to ask about that during the meeting. What has your experience been?`;
  }

  // Default / "accommodation": Possible accommodation or support
  let difficultyClause = rawFound
    .replace(/^[^:]{2,35}:\s*/, "")
    .replace(
      /^(the\s+iep\s+(describes|notes|states)\s+(that\s+)?|difficulty\s+with\s+)/i,
      ""
    )
    .trim();
  difficultyClause = lowerFirstUnlessAcronym(
    difficultyClause || "this classroom challenge"
  );

  let accommodationClause = rawWant
    .replace(
      /^(we\s+would\s+like\s+to\s+(discuss\s+|ask\s+for\s+|request\s+)?|we'd\s+like\s+to\s+ask\s+(the\s+(iep\s+)?team\s+to\s+consider\s+)?|ask\s+the\s+(iep\s+)?team\s+to\s+consider\s+|can\s+the\s+team\s+consider\s+)/i,
      ""
    )
    .trim();
  accommodationClause = lowerFirstUnlessAcronym(
    accommodationClause ||
      lowerFirstUnlessAcronym(target.targetName || "this support")
  );

  let benefitClause = rawWhy
    .replace(/^[^:]{2,35}:\s*/, "")
    .replace(
      /^(so\s+(that\s+)?(your\s+child|the\s+student|\w+)\s+can\s+|to\s+help\s+(your\s+child|the\s+student|\w+)\s+|we\s+need\s+a\s+clear\s+way\s+to\s+)/i,
      ""
    )
    .trim();
  benefitClause = lowerFirstUnlessAcronym(
    benefitClause || "feel supported and make steady progress in class"
  );

  // Choose natural connector for intended benefit
  const benefitPhrase = /^(stay|access|participate|focus|complete|learn|transition|manage|regulate|receive|track|have|build|use|communicate|understand|work)\b/i.test(
    benefitClause
  )
    ? `so ${studentFirst} can ${benefitClause}`
    : `so ${studentFirst} can have better support (${benefitClause})`;

  return `We found a possible accommodation that may help with ${difficultyClause}. We’d like to ask the IEP team to consider ${accommodationClause} ${benefitPhrase}. Does that sound helpful based on what you see?`;
}

export function getEffectiveWhatToSayToParentScript(
  target: Partial<MeetingTarget>,
  studentName?: string
): string {
  if (target.whatToSayToParent && target.whatToSayToParent.trim().length > 0) {
    return target.whatToSayToParent;
  }
  return generateWhatToSayToParentScript(target, { studentName });
}

export function updateWhatToSayToParentManualEdit(
  target: MeetingTarget,
  editedScript: string
): MeetingTarget {
  return {
    ...target,
    whatToSayToParent: editedScript,
    whatToSayToParentEdited: true,
  };
}

export function regenerateWhatToSayToParentForTarget(
  target: MeetingTarget,
  options?: {
    studentName?: string;
    style?: ParentScriptStyleType;
    forceOverwriteEdited?: boolean;
  }
): {
  updatedTarget: MeetingTarget;
  wasSkippedBecauseEdited: boolean;
  suggestedScript: string;
} {
  const nextStyle = options?.style ?? target.whatToSayToParentStyle ?? "auto";
  const suggestedScript = generateWhatToSayToParentScript(
    {
      ...target,
      whatToSayToParentStyle: nextStyle,
    },
    {
      studentName: options?.studentName,
      style: nextStyle,
    }
  );

  // Preserve manual edits: never overwrite an edited script unless explicitly forced by the user
  if (target.whatToSayToParentEdited && !options?.forceOverwriteEdited) {
    return {
      updatedTarget: target,
      wasSkippedBecauseEdited: true,
      suggestedScript,
    };
  }

  return {
    updatedTarget: {
      ...target,
      whatToSayToParent: suggestedScript,
      whatToSayToParentEdited: false,
      whatToSayToParentStyle: nextStyle,
    },
    wasSkippedBecauseEdited: false,
    suggestedScript,
  };
}

export function regenerateWhatToSayToParentAcrossTargets(
  targets: MeetingTarget[],
  options?: { studentName?: string }
): {
  updatedTargets: MeetingTarget[];
  regeneratedCount: number;
  preservedEditedCount: number;
} {
  let regeneratedCount = 0;
  let preservedEditedCount = 0;

  const updatedTargets = targets.map((t) => {
    const res = regenerateWhatToSayToParentForTarget(t, {
      studentName: options?.studentName,
      forceOverwriteEdited: false,
    });
    if (res.wasSkippedBecauseEdited) {
      preservedEditedCount += 1;
      return t;
    }
    regeneratedCount += 1;
    return res.updatedTarget;
  });

  return {
    updatedTargets,
    regeneratedCount,
    preservedEditedCount,
  };
}

export function getCanonicalTargetIdForFinding(findingId: string): string {
  return findingId.startsWith("target-from-")
    ? findingId
    : `target-from-${findingId}`;
}

export function resolveConnectedTargetForFinding(
  finding: Pick<IepIntelFinding, "id" | "linkedTargetId">,
  targets: MeetingTarget[]
): MeetingTarget | null {
  const canonicalId = getCanonicalTargetIdForFinding(finding.id);
  return (
    targets.find(
      (t) =>
        t.sourceFindingId === finding.id ||
        t.id === canonicalId ||
        (finding.linkedTargetId && t.id === finding.linkedTargetId) ||
        Boolean(t.combinedSourceFindingIds?.includes(finding.id))
    ) || null
  );
}

export function hasRecordedMeetingOutcome(
  target: MeetingTarget | null | undefined
): boolean {
  if (!target) return false;
  return Boolean(
    target.requestRaised ||
      (target.meetingStatus && target.meetingStatus !== "NOT_DISCUSSED") ||
      target.pwnNeeded ||
      target.addedToIep ||
      target.followUpNeeded ||
      target.approvedAt ||
      (target.notes && target.notes.trim().length > 0)
  );
}

export function getFindingStageStatus(
  finding: IepIntelFinding,
  targets: MeetingTarget[],
  workspaceStatus?: MeetingWorkspaceStatus
): {
  stageStatus: ConnectedFindingStageStatus;
  connectedTarget: MeetingTarget | null;
  hasMeetingHistory: boolean;
} {
  const connectedTarget = resolveConnectedTargetForFinding(finding, targets);
  const hasMeetingHistory =
    hasRecordedMeetingOutcome(connectedTarget) ||
    Boolean(finding.archivedMeetingOutcome);

  if (
    connectedTarget &&
    !connectedTarget.archivedOrWithdrawn &&
    !connectedTarget.removedFromPlan
  ) {
    const effectiveDest = getEffectiveTargetDestination(connectedTarget);
    const isExplicitlyInFinalPlan = effectiveDest === "final_meeting_plan";
    const isOnAgenda =
      isExplicitlyInFinalPlan ||
      hasRecordedMeetingOutcome(connectedTarget) ||
      workspaceStatus === "READY" ||
      workspaceStatus === "LIVE" ||
      workspaceStatus === "COMPLETED";
    return {
      stageStatus: isOnAgenda ? "on_meeting_agenda" : "in_blueprint",
      connectedTarget,
      hasMeetingHistory,
    };
  }

  if (
    connectedTarget?.archivedOrWithdrawn ||
    Boolean(finding.archivedMeetingOutcome)
  ) {
    return {
      stageStatus: "withdrawn_history",
      connectedTarget,
      hasMeetingHistory: true,
    };
  }

  if (finding.status === "dismiss" || finding.reviewDecision === "dismissed") {
    return {
      stageStatus: "dismissed",
      connectedTarget: null,
      hasMeetingHistory,
    };
  }

  if (
    finding.reviewDecision === "saved" ||
    finding.advocateConfirmed ||
    finding.isCustom
  ) {
    return {
      stageStatus: "saved_for_later",
      connectedTarget: null,
      hasMeetingHistory,
    };
  }

  return {
    stageStatus: "pending",
    connectedTarget: null,
    hasMeetingHistory,
  };
}

export function formatFindingSourcesList(finding: IepIntelFinding): string[] {
  const sources: string[] = [];
  if (finding.sourceRef?.fileName) {
    const pagePart = finding.sourceRef.pdfPageNumber
      ? ` · PDF p. ${finding.sourceRef.pdfPageNumber}${
          finding.sourceRef.printedPageLabel
            ? ` (${finding.sourceRef.printedPageLabel})`
            : ""
        }`
      : "";
    sources.push(`${finding.sourceRef.fileName}${pagePart}`);
  }
  if (finding.evalSourceRef?.fileName) {
    const pagePart = finding.evalSourceRef.pdfPageNumber
      ? ` · PDF p. ${finding.evalSourceRef.pdfPageNumber}`
      : "";
    sources.push(`${finding.evalSourceRef.fileName}${pagePart}`);
  }
  if (sources.length === 0 && finding.quote) {
    sources.push(finding.quote);
  }
  if (sources.length === 0) {
    sources.push("Records Review");
  }
  return sources;
}

export function upsertConnectedTargetFromFinding(params: {
  finding: IepIntelFinding;
  targets: MeetingTarget[];
  meetingQuestion?: string;
}): {
  updatedTargets: MeetingTarget[];
  target: MeetingTarget;
  wasExisting: boolean;
} {
  const { finding, targets, meetingQuestion } = params;
  const canonicalId = getCanonicalTargetIdForFinding(finding.id);
  const existing = resolveConnectedTargetForFinding(finding, targets);

  const resolvedQuestion =
    (meetingQuestion || "").trim() ||
    (finding.proposedQuestion || "").trim() ||
    finding.text;

  const sources = formatFindingSourcesList(finding);
  const evidenceText =
    finding.sourceRef?.excerpt ||
    finding.evalSourceRef?.excerpt ||
    finding.quote ||
    finding.text;

  const sectionLabel =
    finding.section || finding.category || "Accommodations / Supports";
  const sectionOrder = getCanonicalIepSectionOrder(sectionLabel);

  const cleanTitle =
    finding.category && finding.category.length <= 42
      ? `${finding.category}: ${finding.text.slice(0, 44)}${
          finding.text.length > 44 ? "…" : ""
        }`
      : finding.text.slice(0, 56) + (finding.text.length > 56 ? "…" : "");

  if (existing) {
    const nextWhatWeFound = existing.parentWhatWeFound || finding.text;
    const nextWhatWeWant = existing.parentWhatWeWant || resolvedQuestion;
    const nextWhyWeWantIt =
      existing.parentWhyWeWantIt ||
      finding.whyItMatters ||
      finding.text;

    const candidateForScript: Partial<MeetingTarget> = {
      ...existing,
      targetName: existing.targetName || cleanTitle,
      iepSection: sectionLabel,
      parentWhatWeFound: nextWhatWeFound,
      parentWhatWeWant: nextWhatWeWant,
      parentWhyWeWantIt: nextWhyWeWantIt,
      whyWeWantIt: finding.text,
      quickAdvocateSayThis: resolvedQuestion,
      fullAdvocateScript: finding.text,
      supportingEvidence: evidenceText,
    };

    const preservedOrSuggestedScript = existing.whatToSayToParentEdited
      ? existing.whatToSayToParent
      : generateWhatToSayToParentScript(candidateForScript);

    const updatedTarget: MeetingTarget = {
      ...existing,
      sourceFindingId: existing.sourceFindingId || finding.id,
      targetName: existing.targetName || cleanTitle,
      iepSection: sectionLabel,
      quickAdvocateSayThis: resolvedQuestion,
      fullAdvocateScript: finding.text,
      putItHereLocation:
        existing.putItHereLocation || `IEP Section: ${sectionLabel}`,
      possibleIepWording: existing.possibleIepWording || finding.text,
      whyWeWantIt: finding.text,
      supportingEvidence: evidenceText,
      sources: Array.from(new Set([...(existing.sources || []), ...sources])),
      parentWhatWeFound: nextWhatWeFound,
      parentWhatWeWant: nextWhatWeWant,
      parentWhyWeWantIt: nextWhyWeWantIt,
      parentInput:
        existing.parentInput ||
        "Does this match what you are seeing? Is this a priority for you?",
      parentSupportingEvidence: evidenceText,
      whatToSayToParent: preservedOrSuggestedScript,
      whatToSayToParentEdited: Boolean(existing.whatToSayToParentEdited),
      parentReviewStatus:
        existing.parentReviewStatus || "review_with_parent",
      blueprintDestination:
        existing.blueprintDestination || "keep_in_blueprint",
      sourceRef: finding.sourceRef ?? existing.sourceRef,
      evalSourceRef: finding.evalSourceRef ?? existing.evalSourceRef,
      priority: finding.priority ?? existing.priority,
      sourceMaterialFlaggedForReview: finding.sourceMaterialFlaggedForReview,
      sourceMaterialFlagReason: finding.sourceMaterialFlagReason,
      removedFromPlan: false,
      removedFromPlanAt: undefined,
      archivedOrWithdrawn: false,
      archivedAt: undefined,
      archivedReason: undefined,
    };

    return {
      updatedTargets: targets.map((t) =>
        t.id === existing.id ? updatedTarget : t
      ),
      target: updatedTarget,
      wasExisting: true,
    };
  }

  const baseCreatedTarget: MeetingTarget = {
    id: canonicalId,
    sourceFindingId: finding.id,
    targetName: cleanTitle,
    iepSection: sectionLabel,
    sectionOrder,
    targetOrder: targets.length + 1,
    quickAdvocateSayThis: resolvedQuestion,
    fullAdvocateScript: finding.text,
    putItHereLocation: `IEP Section: ${sectionLabel}`,
    possibleIepWording: finding.text,
    whyWeWantIt: finding.text,
    supportingEvidence: evidenceText,
    sources,
    ifTeamDisagrees:
      "Request Prior Written Notice (PWN) documenting the evaluation data relied upon.",
    parentWhatWeFound: finding.text,
    parentWhatWeWant: resolvedQuestion,
    parentWhyWeWantIt:
      finding.whyItMatters ||
      finding.text,
    parentInput:
      "Does this match what you are seeing? Is this a priority for you?",
    parentSupportingEvidence: evidenceText,
    whatToSayToParentEdited: false,
    parentReviewStatus: "review_with_parent",
    blueprintDestination: "keep_in_blueprint",
    requestRaised: false,
    meetingStatus: "NOT_DISCUSSED",
    pwnNeeded: false,
    addedToIep: false,
    followUpNeeded: false,
    isCustom: true,
    sourceRef: finding.sourceRef,
    evalSourceRef: finding.evalSourceRef,
    priority: finding.priority || "medium",
    sourceMaterialFlaggedForReview: finding.sourceMaterialFlaggedForReview,
    sourceMaterialFlagReason: finding.sourceMaterialFlagReason,
  };

  const createdTarget: MeetingTarget = {
    ...baseCreatedTarget,
    whatToSayToParent: generateWhatToSayToParentScript(baseCreatedTarget),
  };

  return {
    updatedTargets: [...targets, createdTarget],
    target: createdTarget,
    wasExisting: false,
  };
}

export function combinePlanItemsPreservingSources(params: {
  primaryTarget: MeetingTarget;
  secondaryTargets?: MeetingTarget[];
  additionalFindings?: IepIntelFinding[];
  allTargets: MeetingTarget[];
  allFindings?: IepIntelFinding[];
}): {
  combinedTarget: MeetingTarget;
  updatedTargets: MeetingTarget[];
  updatedFindings: IepIntelFinding[];
} {
  const {
    primaryTarget,
    secondaryTargets = [],
    additionalFindings = [],
    allTargets,
    allFindings = [],
  } = params;

  const secondaryTargetIds = new Set(
    secondaryTargets
      .filter((t) => t.id !== primaryTarget.id)
      .map((t) => t.id)
  );

  // Collect every source reference item without losing any citation
  const sourceItemsMap = new Map<string, CombinedFindingSourceItem>();

  const registerTargetSources = (t: MeetingTarget) => {
    const key = t.sourceFindingId || t.id;
    if (!sourceItemsMap.has(key)) {
      sourceItemsMap.set(key, {
        findingId: t.sourceFindingId || t.id,
        findingText: t.parentWhatWeFound || t.fullAdvocateScript || t.targetName,
        iepSection: t.iepSection,
        sourceRef: t.sourceRef,
        evalSourceRef: t.evalSourceRef,
        sources: t.sources,
      });
    }
    (t.combinedSourceItems || []).forEach((item) => {
      if (!sourceItemsMap.has(item.findingId)) {
        sourceItemsMap.set(item.findingId, item);
      }
    });
  };

  registerTargetSources(primaryTarget);
  secondaryTargets.forEach(registerTargetSources);

  additionalFindings.forEach((f) => {
    if (!sourceItemsMap.has(f.id)) {
      sourceItemsMap.set(f.id, {
        findingId: f.id,
        findingText: f.text,
        iepSection: f.section || f.category,
        sourceRef: f.sourceRef,
        evalSourceRef: f.evalSourceRef,
        sources: formatFindingSourcesList(f),
      });
    }
  });

  const combinedSourceItems = Array.from(sourceItemsMap.values());
  const combinedSourceFindingIds = Array.from(
    new Set([
      ...(primaryTarget.sourceFindingId ? [primaryTarget.sourceFindingId] : []),
      ...(primaryTarget.combinedSourceFindingIds || []),
      ...secondaryTargets.flatMap((t) => [
        ...(t.sourceFindingId ? [t.sourceFindingId] : []),
        ...(t.combinedSourceFindingIds || []),
      ]),
      ...additionalFindings.map((f) => f.id),
    ])
  );

  const mergedSources = Array.from(
    new Set([
      ...(primaryTarget.sources || []),
      ...secondaryTargets.flatMap((t) => t.sources || []),
      ...additionalFindings.flatMap((f) => formatFindingSourcesList(f)),
    ])
  );

  const joinDistinct = (parts: Array<string | undefined>): string => {
    const seen = new Set<string>();
    const clean: string[] = [];
    parts.forEach((p) => {
      const trimmed = (p || "").trim();
      if (trimmed && !seen.has(trimmed)) {
        seen.add(trimmed);
        clean.push(trimmed);
      }
    });
    return clean.join(" · ");
  };

  const combinedWhatWeFound = joinDistinct([
    primaryTarget.parentWhatWeFound || primaryTarget.fullAdvocateScript,
    ...secondaryTargets.map(
      (t) => t.parentWhatWeFound || t.fullAdvocateScript
    ),
    ...additionalFindings.map((f) => f.text),
  ]);

  const combinedWhyItMatters = joinDistinct([
    primaryTarget.parentWhyWeWantIt || primaryTarget.whyWeWantIt,
    ...secondaryTargets.map((t) => t.parentWhyWeWantIt || t.whyWeWantIt),
    ...additionalFindings.map((f) => f.whyItMatters || f.text),
  ]);

  const combinedWhatWeWant = joinDistinct([
    primaryTarget.parentWhatWeWant || primaryTarget.quickAdvocateSayThis,
    ...secondaryTargets.map(
      (t) => t.parentWhatWeWant || t.quickAdvocateSayThis
    ),
    ...additionalFindings.map((f) => f.proposedQuestion),
  ]);

  const combinedSupportingEvidence = joinDistinct([
    primaryTarget.supportingEvidence,
    ...secondaryTargets.map((t) => t.supportingEvidence),
    ...additionalFindings.map(
      (f) => f.sourceRef?.excerpt || f.evalSourceRef?.excerpt || f.quote
    ),
  ]);

  const baseCombinedTarget: MeetingTarget = {
    ...primaryTarget,
    parentWhatWeFound: combinedWhatWeFound || primaryTarget.parentWhatWeFound,
    parentWhyWeWantIt: combinedWhyItMatters || primaryTarget.parentWhyWeWantIt,
    whyWeWantIt: combinedWhyItMatters || primaryTarget.whyWeWantIt,
    parentWhatWeWant: combinedWhatWeWant || primaryTarget.parentWhatWeWant,
    quickAdvocateSayThis:
      combinedWhatWeWant || primaryTarget.quickAdvocateSayThis,
    supportingEvidence:
      combinedSupportingEvidence || primaryTarget.supportingEvidence,
    parentSupportingEvidence:
      combinedSupportingEvidence || primaryTarget.parentSupportingEvidence,
    sources: mergedSources,
    combinedSourceFindingIds,
    combinedSourceItems,
    sourceRef:
      primaryTarget.sourceRef ||
      secondaryTargets.find((t) => t.sourceRef)?.sourceRef ||
      additionalFindings.find((f) => f.sourceRef)?.sourceRef,
    evalSourceRef:
      primaryTarget.evalSourceRef ||
      secondaryTargets.find((t) => t.evalSourceRef)?.evalSourceRef ||
      additionalFindings.find((f) => f.evalSourceRef)?.evalSourceRef,
  };

  const combinedTarget: MeetingTarget = {
    ...baseCombinedTarget,
    whatToSayToParent: primaryTarget.whatToSayToParentEdited
      ? primaryTarget.whatToSayToParent
      : generateWhatToSayToParentScript(baseCombinedTarget),
    whatToSayToParentEdited: Boolean(primaryTarget.whatToSayToParentEdited),
  };

  const updatedTargets = allTargets
    .filter((t) => !secondaryTargetIds.has(t.id))
    .map((t) => (t.id === primaryTarget.id ? combinedTarget : t));

  const updatedFindings = allFindings.map((f) =>
    combinedSourceFindingIds.includes(f.id)
      ? { ...f, linkedTargetId: primaryTarget.id }
      : f
  );

  return {
    combinedTarget,
    updatedTargets,
    updatedFindings,
  };
}

export function syncFindingUpdateToTargets(
  updatedFinding: IepIntelFinding,
  targets: MeetingTarget[],
  meetingQuestion?: string
): MeetingTarget[] {
  const existing = resolveConnectedTargetForFinding(updatedFinding, targets);
  if (!existing) return targets;
  return upsertConnectedTargetFromFinding({
    finding: updatedFinding,
    targets,
    meetingQuestion,
  }).updatedTargets;
}

export function reconcileSourceMaterialChanges(params: {
  findings: IepIntelFinding[];
  vaultDocuments: VaultDocumentOption[];
  designatedCurrentIepId: number | null;
}): IepIntelFinding[] {
  const { findings, vaultDocuments, designatedCurrentIepId } = params;
  if (vaultDocuments.length === 0) return findings;
  const vaultIds = new Set(vaultDocuments.map((d) => d.id));

  return findings.map((f) => {
    const srcDocId = f.sourceRef?.documentId;
    const evalDocId = f.evalSourceRef?.documentId;

    if (srcDocId && srcDocId > 0 && !vaultIds.has(srcDocId)) {
      return {
        ...f,
        sourceMaterialFlaggedForReview: true,
        sourceMaterialFlagReason: `Source record "${
          f.sourceRef?.fileName || "IEP"
        }" is no longer available in the Student Vault. Finding and history are retained for review.`,
      };
    }

    if (evalDocId && evalDocId > 0 && !vaultIds.has(evalDocId)) {
      return {
        ...f,
        sourceMaterialFlaggedForReview: true,
        sourceMaterialFlagReason: `Evaluation record "${
          f.evalSourceRef?.fileName || "Evaluation"
        }" is no longer available in the Student Vault. Finding and history are retained for review.`,
      };
    }

    if (
      srcDocId &&
      srcDocId > 0 &&
      designatedCurrentIepId &&
      srcDocId !== designatedCurrentIepId &&
      !f.evalSourceRef
    ) {
      return {
        ...f,
        sourceMaterialFlaggedForReview: true,
        sourceMaterialFlagReason: `Captured from "${
          f.sourceRef?.fileName || "earlier IEP"
        }" before the Current IEP selection changed. Verify page citation against the current record.`,
      };
    }

    return {
      ...f,
      sourceMaterialFlaggedForReview: false,
      sourceMaterialFlagReason: undefined,
    };
  });
}

