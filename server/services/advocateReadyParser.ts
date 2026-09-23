/**
 * advocateReadyParser.ts
 * High-precision deterministic parser for Waypoint Advocate Ready documents (PG-043).
 *
 * Rules:
 * 1. Read input from pasted text or dropped file content (same parser).
 * 2. Parse `⚡ MEETING QUICK LIST` sections, LABEL, ASK, and EXPAND IDs.
 * 3. Parse detailed `TARGET ID:` blocks with multiline fields.
 * 4. Cross-validate 1-to-1 matching between EXPAND IDs and detailed TARGET IDs.
 * 5. Extract "Additional Things to Discuss" as meeting notes/items, not targets.
 * 6. Initialize all 6 meeting tracking controls as unchecked.
 */

export interface ParsedAdvocateTarget {
  id: string;
  externalTargetId: string; // e.g. "TARGET-001"
  targetName: string;
  iepSection: string;
  sectionOrder: number;
  targetOrder: number;
  quickAdvocateSayThis: string;
  fullAdvocateScript: string;
  putItHereLocation: string;
  possibleIepWording: string;
  whyWeWantIt: string;
  supportingEvidence: string;
  sources: string[];
  ifTeamDisagrees: string;
  parentWhatWeWant: string;
  parentWhyWeWantIt: string;
  parentSupportingEvidence: string;
  meetingStatus: "NOT_DISCUSSED" | "DISCUSSED" | "AGREED" | "DENIED" | "FOLLOW_UP";
  requestRaised: boolean;
  pwnNeeded: boolean;
  addedToIep: boolean;
  followUpNeeded: boolean;
  followUpOwnerDate?: string;
  notes?: string;
  included: boolean;
  needsReview?: boolean;
  reviewReason?: string;
  validationErrors?: string[];
}

export interface ParseAdvocateReadyResult {
  success: boolean;
  detectedOrder: string[];
  targets: ParsedAdvocateTarget[];
  additionalItems: string[];
  totalTargetsCount: number;
  validationErrors: string[];
  batchId: string;
  rawSummary?: string;
}

interface QuickListItem {
  section: string;
  label: string;
  ask: string;
  expandId: string;
  order: number;
}

interface DetailedBlock {
  targetId: string;
  label: string;
  iepSection: string;
  advocateSayThis: string;
  putItHere: string;
  possibleIepWording: string;
  why: string;
  evidence: string;
  ifTeamDisagrees: string;
  source: string;
  notes?: string;
  tracking: {
    discussed: boolean;
    agreed: boolean;
    addedToIep: boolean;
    denied: boolean;
    pwnNeeded: boolean;
    followUp: boolean;
  };
}

export function parseAdvocateReadyDocument(
  rawText: string,
  fileName?: string
): ParseAdvocateReadyResult {
  if (!rawText || typeof rawText !== "string" || rawText.trim().length === 0) {
    return {
      success: false,
      detectedOrder: [],
      targets: [],
      additionalItems: [],
      totalTargetsCount: 0,
      validationErrors: ["No document content provided. The file is empty or could not be read."],
      batchId: `batch-${Date.now()}`,
    };
  }

  const batchId = `draft-${Date.now()}`;
  const lines = rawText.split(/\r?\n/);
  const detectedSections: string[] = [];
  const quickListItems: QuickListItem[] = [];
  const detailedBlocks: Map<string, DetailedBlock> = new Map();
  const additionalItems: string[] = [];
  const validationErrors: string[] = [];

  // Determine split point between Quick List and Detailed Blocks
  // Usually starts with "TARGET ID:" or "# TARGET ID:" or similar.
  let isParsingQuickList = true;
  let currentSection = "Accommodations / Supports";
  let currentQuickLabel = "";
  let currentQuickAsk = "";
  let currentQuickExpand = "";

  // For detailed block state machine
  let currentDetail: DetailedBlock | null = null;
  let currentDetailField: keyof DetailedBlock | null = null;
  let isInsideAdditionalNotes = false;

  const flushQuickItem = () => {
    if (currentQuickExpand || currentQuickLabel) {
      const expandKey = (currentQuickExpand || `AUTO-${quickListItems.length + 1}`).trim().toUpperCase();
      quickListItems.push({
        section: currentSection,
        label: currentQuickLabel.trim(),
        ask: currentQuickAsk.trim(),
        expandId: expandKey,
        order: quickListItems.length + 1,
      });
      currentQuickLabel = "";
      currentQuickAsk = "";
      currentQuickExpand = "";
    }
  };

  const flushDetailedBlock = () => {
    if (currentDetail && currentDetail.targetId) {
      const key = currentDetail.targetId.trim().toUpperCase();
      // Clean up all string fields
      currentDetail.targetId = currentDetail.targetId.trim();
      currentDetail.label = currentDetail.label.trim();
      currentDetail.iepSection = currentDetail.iepSection.trim();
      currentDetail.advocateSayThis = currentDetail.advocateSayThis.trim();
      currentDetail.putItHere = currentDetail.putItHere.trim();
      currentDetail.possibleIepWording = currentDetail.possibleIepWording.trim();
      currentDetail.why = currentDetail.why.trim();
      currentDetail.evidence = currentDetail.evidence.trim();
      currentDetail.ifTeamDisagrees = currentDetail.ifTeamDisagrees.trim();
      currentDetail.source = currentDetail.source.trim();
      if (currentDetail.notes) currentDetail.notes = currentDetail.notes.trim();

      if (detailedBlocks.has(key)) {
        validationErrors.push(`Duplicate Detailed Target ID found: "${key}". Each Target ID must be unique.`);
      } else {
        detailedBlocks.set(key, currentDetail);
      }
      currentDetail = null;
      currentDetailField = null;
    }
  };

function normalizeSectionTitle(sec: string): string {
  const s = sec.trim().replace(/^[#*=\-_~`\s]+/, "").replace(/[#*=\-_~`\s]+$/, "");
  const lower = s.toLowerCase();
  if (lower.includes("parent concern")) return "Parent Concerns";
  if (lower.includes("present level") || lower.includes("academic achievement")) return "Present Levels / Academics";
  if (lower.includes("special factor")) return "Special Factors";
  if (lower.includes("annual goal") || lower.includes("objective/benchmark") || lower === "goals") return "Annual Goals";
  if (lower.includes("student support") || lower.includes("accommodation") || lower.includes("support")) return "Accommodations / Supports";
  if (lower.includes("related service") || lower.includes("aac") || lower.includes("speech") || lower.includes("ot")) return "Related Services / AAC";
  if (lower.includes("placement") || lower.includes("lre")) return "Placement / LRE";
  if (lower.includes("extended school year") || lower.includes("esy") || lower.includes("transportation")) return "ESY & Transportation";
  if (lower.includes("transition")) return "Transition Service Plan";
  if (lower.includes("gaa")) return "GAA Participation";
  if (lower.includes("special education service")) return "Special Education Services";
  if (lower.includes("individualized education program") || lower.includes("iep")) return "Individualized Education Program (IEP)";

  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase());
}

  const cleanHeader = (line: string) => {
    const raw = line
      .replace(/^[#*=\-_~`\s]+/, "")
      .replace(/[#*=\-_~`\s]+$/, "")
      .replace(/^([IVXLCDM]+\.|\d+\.)\s*/i, "")
      .replace(/^[^\w\s/&-]+\s*/, "")
      .trim();
    return normalizeSectionTitle(raw);
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      // Empty line - if in detailed multiline, only append if field has content
      if (currentDetail && currentDetailField && ["advocateSayThis", "possibleIepWording", "why", "evidence", "ifTeamDisagrees"].includes(currentDetailField)) {
        const cur = (currentDetail[currentDetailField] as string);
        if (cur && !cur.endsWith("\n")) {
          (currentDetail[currentDetailField] as string) = `${cur}\n`;
        }
      }
      continue;
    }

    // 1. Check if we hit the detailed targets section: "TARGET ID:"
    if (/^#*\s*TARGET ID\s*[:=]/i.test(trimmed) || /^TARGET ID\s*[:=]/i.test(trimmed)) {
      if (isParsingQuickList) {
        flushQuickItem();
        isParsingQuickList = false;
      }
      isInsideAdditionalNotes = false;
      flushDetailedBlock();

      const idVal = trimmed.replace(/^#*\s*TARGET ID\s*[:=]\s*/i, "").trim();
      currentDetail = {
        targetId: idVal,
        label: "",
        iepSection: currentSection,
        advocateSayThis: "",
        putItHere: "",
        possibleIepWording: "",
        why: "",
        evidence: "",
        ifTeamDisagrees: "",
        source: fileName || "Imported Advocate Ready",
        tracking: {
          discussed: false,
          agreed: false,
          addedToIep: false,
          denied: false,
          pwnNeeded: false,
          followUp: false,
        },
      };
      currentDetailField = "targetId";
      continue;
    }

    // 2. Check for Additional Things to Discuss / Before We Close section
    if (
      /(ADDITIONAL THINGS TO DISCUSS|BEFORE WE CLOSE|PARKING LOT ITEMS|CLOSING NOTES)/i.test(trimmed)
    ) {
      if (isParsingQuickList) {
        flushQuickItem();
      }
      flushDetailedBlock();
      isInsideAdditionalNotes = true;
      continue;
    }

    if (isInsideAdditionalNotes) {
      // Look for lines like "1. ____________" or "☐ ____________" or notes
      const noteMatch = trimmed.match(/^(\d+\.|\*|-|•|\[[ xX]?\]|[☐☑])\s*(.*)$/);
      if (noteMatch) {
        const text = noteMatch[2].replace(/^[_\s]+|[_\s]+$/g, "").trim();
        if (text) {
          additionalItems.push(text);
        }
      } else if (!trimmed.startsWith("===") && !trimmed.startsWith("---") && !trimmed.includes("_____")) {
        const text = trimmed.replace(/^[_\s]+|[_\s]+$/g, "").trim();
        if (text) {
          additionalItems.push(text);
        }
      }
      continue;
    }

    // --- PARSING QUICK LIST ---
    if (isParsingQuickList) {
      // Check for Quick List Header
      if (/MEETING QUICK LIST/i.test(trimmed)) {
        continue;
      }

      // Check for Section Header (markdown ##, Roman numerals, emoji headings, or capitalized section names)
      if (
        /^#{1,6}\s+/i.test(trimmed) ||
        /^([IVXLCDM]+\.|\d+\.)\s+[A-Z]/i.test(trimmed.replace(/^#{1,6}\s*/, "")) ||
        /^(📋|📚|⚙|⚙️|🎯|👥|🏫|🚌|💡|⚡|🔍|\bSECTION\b|\bIEP SECTION\b)/i.test(trimmed) ||
        (/^[A-Z\s/&().,-]{4,}$/.test(trimmed) && !trimmed.startsWith("LABEL") && !trimmed.startsWith("ASK") && !trimmed.startsWith("EXPAND"))
      ) {
        flushQuickItem();
        const secName = cleanHeader(trimmed);
        if (secName && !["MEETING QUICK LIST", "QUICK LIST", "EXPAND", "LABEL", "ASK"].includes(secName.toUpperCase())) {
          currentSection = secName;
          if (!detectedSections.includes(secName)) {
            detectedSections.push(secName);
          }
        }
        continue;
      }

      // Check for LABEL:
      if (/^LABEL\s*[:=]/i.test(trimmed)) {
        if (currentQuickLabel && (currentQuickAsk || currentQuickExpand)) {
          flushQuickItem();
        }
        currentQuickLabel = trimmed.replace(/^LABEL\s*[:=]\s*/i, "").trim();
        continue;
      }

      // Check for ASK:
      if (/^ASK\s*[:=]/i.test(trimmed)) {
        currentQuickAsk = trimmed.replace(/^ASK\s*[:=]\s*/i, "").replace(/^["']|["']$/g, "").trim();
        continue;
      }

      // Check for EXPAND:
      if (/^EXPAND\s*[:=]/i.test(trimmed)) {
        currentQuickExpand = trimmed.replace(/^EXPAND\s*[:=]\s*/i, "").trim();
        flushQuickItem();
        continue;
      }

      // If line is an unlabelled target or ask
      if (trimmed.startsWith('"') && trimmed.endsWith('"') && !currentQuickAsk) {
        currentQuickAsk = trimmed.replace(/^["']|["']$/g, "");
      }
      continue;
    }

    // --- PARSING DETAILED BLOCKS ---
    if (currentDetail) {
      if (/^TARGET LABEL\s*[:=]/i.test(trimmed) || /^LABEL\s*[:=]/i.test(trimmed)) {
        const val = trimmed.replace(/^(TARGET LABEL|LABEL)\s*[:=]\s*/i, "").trim();
        if (val) {
          currentDetail.label = val;
          currentDetailField = null;
        } else {
          currentDetailField = "label";
        }
        continue;
      }

      if (/^IEP SECTION\s*[:=]/i.test(trimmed) || /^SECTION\s*[:=]/i.test(trimmed)) {
        const val = trimmed.replace(/^(IEP SECTION|SECTION)\s*[:=]\s*/i, "").trim();
        if (val) {
          currentDetail.iepSection = normalizeSectionTitle(val);
          currentDetailField = null;
        } else {
          currentDetailField = "iepSection";
        }
        continue;
      }

      if (/^ADVOCATE SAY THIS\s*[:=]/i.test(trimmed) || /^SAY THIS\s*[:=]/i.test(trimmed)) {
        const val = trimmed.replace(/^(ADVOCATE SAY THIS|SAY THIS)\s*[:=]\s*/i, "").replace(/^["']|["']$/g, "").trim();
        currentDetail.advocateSayThis = val;
        currentDetailField = "advocateSayThis";
        continue;
      }

      if (/^PUT IT HERE\s*[:=]/i.test(trimmed) || /^LOCATION\s*[:=]/i.test(trimmed)) {
        const val = trimmed.replace(/^(PUT IT HERE|LOCATION)\s*[:=]\s*/i, "").trim();
        currentDetail.putItHere = val;
        currentDetailField = "putItHere";
        continue;
      }

      if (/^POSSIBLE IEP WORDING\s*[:=]/i.test(trimmed) || /^IEP WORDING\s*[:=]/i.test(trimmed)) {
        const val = trimmed.replace(/^(POSSIBLE IEP WORDING|IEP WORDING)\s*[:=]\s*/i, "").replace(/^["']|["']$/g, "").trim();
        currentDetail.possibleIepWording = val;
        currentDetailField = "possibleIepWording";
        continue;
      }

      if (/^WHY\s*[:=]/i.test(trimmed) || /^WHY WE WANT IT\s*[:=]/i.test(trimmed)) {
        const val = trimmed.replace(/^(WHY WE WANT IT|WHY)\s*[:=]\s*/i, "").trim();
        currentDetail.why = val;
        currentDetailField = "why";
        continue;
      }

      if (/^EVIDENCE\s*[:=]/i.test(trimmed) || /^SUPPORTING EVIDENCE\s*[:=]/i.test(trimmed) || /^DATA\s*[:=]/i.test(trimmed)) {
        const val = trimmed.replace(/^(SUPPORTING EVIDENCE|EVIDENCE|DATA)\s*[:=]\s*/i, "").trim();
        currentDetail.evidence = val;
        currentDetailField = "evidence";
        continue;
      }

      if (/^IF TEAM DISAGREES\s*[:=]/i.test(trimmed) || /^DISAGREES\s*[:=]/i.test(trimmed)) {
        const val = trimmed.replace(/^(IF TEAM DISAGREES|DISAGREES)\s*[:=]\s*/i, "").trim();
        currentDetail.ifTeamDisagrees = val;
        currentDetailField = "ifTeamDisagrees";
        continue;
      }

      if (/^SOURCE\s*[:=]/i.test(trimmed) || /^SOURCES\s*[:=]/i.test(trimmed)) {
        const val = trimmed.replace(/^(SOURCES|SOURCE)\s*[:=]\s*/i, "").trim();
        currentDetail.source = val;
        currentDetailField = "source";
        continue;
      }

      if (/^(ADVOCATE NOTES|MEETING NOTES|MY NOTES|NOTES)\s*[:=]/i.test(trimmed)) {
        const val = trimmed.replace(/^(ADVOCATE NOTES|MEETING NOTES|MY NOTES|NOTES)\s*[:=]\s*/i, "").trim();
        currentDetail.notes = val;
        currentDetailField = "notes";
        continue;
      }

      if (/^MEETING TRACKING\s*[:=]?/i.test(trimmed)) {
        currentDetailField = null;
        continue;
      }

      // Ignore horizontal separators
      if (/^[-=_*~]{3,}$/.test(trimmed)) {
        continue;
      }

      // Check tracking checkboxes (handles [ ], [x], [X], ☐, ☑)
      if (/^(\[([ xX])\]|[☐☑])\s*(Discussed|Agreed|Added to IEP|Denied|PWN Needed|Follow-Up)/i.test(trimmed)) {
        const checked = /\[[xX]\]|☑/.test(trimmed);
        if (/Discussed/i.test(trimmed)) currentDetail.tracking.discussed = checked;
        if (/Agreed/i.test(trimmed)) currentDetail.tracking.agreed = checked;
        if (/Added to IEP/i.test(trimmed)) currentDetail.tracking.addedToIep = checked;
        if (/Denied/i.test(trimmed)) currentDetail.tracking.denied = checked;
        if (/PWN Needed/i.test(trimmed)) currentDetail.tracking.pwnNeeded = checked;
        if (/Follow-Up/i.test(trimmed)) currentDetail.tracking.followUp = checked;
        continue;
      }

      // Continuation line for fields
      if (currentDetailField && typeof currentDetail[currentDetailField] === "string") {
        const existing = (currentDetail[currentDetailField] as string).trim();
        if (currentDetailField === "iepSection") {
          currentDetail.iepSection = normalizeSectionTitle(trimmed);
          currentDetailField = null;
        } else if (currentDetailField === "label") {
          currentDetail.label = trimmed;
          currentDetailField = null;
        } else {
          currentDetail[currentDetailField] = existing ? `${existing}\n${trimmed}` : trimmed;
        }
      }
    }
  }

  // Final flush
  flushQuickItem();
  flushDetailedBlock();

  // If no quick list was found, but detailed blocks exist, synthesize quick list
  if (quickListItems.length === 0 && detailedBlocks.size > 0) {
    let qIdx = 1;
    detailedBlocks.forEach((d) => {
      quickListItems.push({
        section: d.iepSection || "Accommodations / Supports",
        label: d.label || `Target ${qIdx}`,
        ask: d.advocateSayThis || "",
        expandId: d.targetId || `TARGET-${String(qIdx).padStart(3, "0")}`,
        order: qIdx++,
      });
    });
  }

  // Cross-validation and mapping
  const parsedTargets: ParsedAdvocateTarget[] = [];
  const matchedDetailIds = new Set<string>();

  quickListItems.forEach((q, idx) => {
    const detailKey = q.expandId.trim().toUpperCase();
    const detail = detailedBlocks.get(detailKey);
    const targetValidationErrors: string[] = [];

    if (!detail) {
      targetValidationErrors.push(`Missing matching detailed TARGET ID: "${q.expandId}" for Quick List item "${q.label}".`);
      validationErrors.push(`Quick List item #${idx + 1} (${q.label}) references "${q.expandId}", but no matching "TARGET ID: ${q.expandId}" block was found.`);
    } else {
      matchedDetailIds.add(detailKey);
    }

    const targetLabel = (detail?.label || q.label || `Target ${idx + 1}`).trim();
    const askSentence = (q.ask || detail?.advocateSayThis || "").replace(/^["']|["']$/g, "").trim();
    const sectionName = detail?.iepSection || q.section || "Accommodations / Supports";

    const target: ParsedAdvocateTarget = {
      id: `${batchId}-${q.expandId}`,
      externalTargetId: q.expandId,
      targetName: targetLabel,
      iepSection: sectionName,
      sectionOrder: detectedSections.indexOf(sectionName) + 1 || (idx + 1),
      targetOrder: idx + 1,
      quickAdvocateSayThis: askSentence,
      fullAdvocateScript: detail?.advocateSayThis || askSentence,
      putItHereLocation: detail?.putItHere || sectionName,
      possibleIepWording: detail?.possibleIepWording || "",
      whyWeWantIt: detail?.why || "To support educational progress.",
      supportingEvidence: detail?.evidence || "Documented case records.",
      sources: detail?.source ? [detail.source] : [fileName || "Imported Advocate Ready"],
      ifTeamDisagrees: detail?.ifTeamDisagrees || "If refused, request Prior Written Notice documenting the refusal rationale.",
      parentWhatWeWant: targetLabel,
      parentWhyWeWantIt: detail?.why || "To ensure appropriate classroom support.",
      parentSupportingEvidence: detail?.evidence || "Evaluations and observations.",
      meetingStatus: "NOT_DISCUSSED",
      requestRaised: false,
      pwnNeeded: false,
      addedToIep: false,
      followUpNeeded: false,
      notes: detail?.notes || "",
      included: true,
      needsReview: targetValidationErrors.length > 0,
      reviewReason: targetValidationErrors.length > 0 ? targetValidationErrors.join(" ") : undefined,
      validationErrors: targetValidationErrors,
    };

    parsedTargets.push(target);
  });

  // Check for orphan detailed blocks not in Quick List
  detailedBlocks.forEach((d, key) => {
    if (!matchedDetailIds.has(key)) {
      validationErrors.push(`Detailed block "${key}" (${d.label}) has no corresponding EXPAND entry in the Quick List.`);
    }
  });

  // If detectedSections is empty, fallback to standard IEP order
  const finalDetectedOrder = detectedSections.length > 0
    ? detectedSections
    : [
        "Parent Concerns",
        "Present Levels / Academics",
        "Special Factors",
        "Annual Goals",
        "Accommodations / Supports",
        "Related Services / AAC",
        "Placement / LRE",
        "ESY & Transportation",
      ];

  return {
    success: validationErrors.length === 0 && parsedTargets.length > 0,
    detectedOrder: finalDetectedOrder,
    targets: parsedTargets,
    additionalItems,
    totalTargetsCount: parsedTargets.length,
    validationErrors,
    batchId,
    rawSummary: `Parsed ${parsedTargets.length} targets across ${finalDetectedOrder.length} IEP sections.`,
  };
}
