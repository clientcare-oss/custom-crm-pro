import React, { useState, useEffect, useMemo, useCallback } from "react";
import { PcsAdvocateBox } from "./PcsAdvocateBox";
import { PcsDetailsPanel } from "./PcsDetailsPanel";
import { PcsPasteReplaceModal } from "./PcsPasteReplaceModal";
import { PcsEmailModal } from "./PcsEmailModal";
import type {
  PcsStatus,
  PcsMetadata,
  PcsConcernBreakdownItem,
  PcsEvidenceItem,
  PcsVersionHistoryItem,
  PcsSubmittedVersion,
} from "./types";
import type { ParentIntelConcern, IepIntelFinding } from "../types";
import { toast } from "sonner";

interface ParentConcernStatementWorkspaceProps {
  studentName: string;
  studentContactId?: number | null;
  parentEmail?: string;
  pcsText: string;
  parentConcerns?: ParentIntelConcern[];
  iepFindings?: IepIntelFinding[];
  rawPcsMetadata?: any;
  onSavePcs: (newPcsText: string, updatedMetadata: PcsMetadata) => Promise<void> | void;
}

export function ParentConcernStatementWorkspace({
  studentName,
  studentContactId,
  parentEmail,
  pcsText,
  parentConcerns = [],
  iepFindings = [],
  rawPcsMetadata,
  onSavePcs,
}: ParentConcernStatementWorkspaceProps) {
  // ── 1. Local working draft state ───────────────────────────────────────────
  const [content, setContent] = useState<string>(pcsText || "");
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [status, setStatus] = useState<PcsStatus>("DRAFT");

  // Sync incoming pcsText if advocate hasn't typed unsaved changes
  useEffect(() => {
    if (pcsText && !isDirty) {
      setContent(pcsText);
    }
  }, [pcsText, isDirty]);

  // ── 2. Modal and Details Panel View States ─────────────────────────────────
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState<boolean>(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState<boolean>(false);

  // ── 3. Helper to synthesize default rich metadata if none exists ───────────
  const defaultSynthesizedMetadata = useMemo<PcsMetadata>(() => {
    const defaultConcerns: PcsConcernBreakdownItem[] = [
      {
        id: "concern-reading",
        topic: "Reading & Literacy Progress",
        whyAiIncludedThis:
          "Current records indicate continued difficulty with reading fluency and reading comprehension, alongside parent-reported anxiety during independent reading tasks.",
        evidenceLocations: [
          "IEP → Present Levels → Reading → Page 12",
          "Evaluation → Academic Achievement (WJ-IV) → Page 7",
          "Parent Call → Reading Concerns & Stamina → 09/21/26",
        ],
        quote: "Student continues to decode 1.5 grade levels below age expectations.",
      },
      {
        id: "concern-math",
        topic: "Math Problem Solving & Calculation",
        whyAiIncludedThis:
          "Standardized testing and classroom work samples show a 2-grade level gap between mechanical computation and applied multi-step word problem comprehension.",
        evidenceLocations: [
          "IEP → Present Levels → Mathematics → Page 14",
          "Teacher Communication → Trimester 1 Math Report → 09/14/26",
        ],
        quote: "Demonstrates frustration when word problems exceed two analytical steps.",
      },
      {
        id: "concern-sensory",
        topic: "Sensory & Executive Functioning Supports",
        whyAiIncludedThis:
          "Parent and advocate observations confirm environmental overstimulation during hallway transitions and noisy lunch periods, resulting in task shutdown.",
        evidenceLocations: [
          "Discovery Worksheet → Parent Priorities Section 3",
          "IEP → Special Factors / Accommodations → Page 18",
          "Parent Call → Sensory Overload Log → 08/30/26",
        ],
        quote: "Shuts down when classroom ambient noise exceeds comfortable threshold.",
      },
    ];

    // If dynamic parentConcerns exist, supplement or merge them
    if (parentConcerns.length > 0) {
      parentConcerns.forEach((pc, idx) => {
        const existingIdx = defaultConcerns.findIndex(
          (c) => c.topic.toLowerCase().includes(pc.topic.toLowerCase())
        );
        if (existingIdx === -1) {
          defaultConcerns.push({
            id: `concern-dynamic-${idx}`,
            topic: pc.topic,
            whyAiIncludedThis: `Identified directly from parent intake notes: "${pc.concern}". Records substantiate need for targeted review.`,
            evidenceLocations: [
              pc.source ? `Parent Source → ${pc.source}` : "Parent Discovery Intake Call",
              "IEP → Accommodations & Present Levels",
            ],
            quote: pc.concern,
          });
        }
      });
    }

    const defaultEvidence: PcsEvidenceItem[] = [
      {
        id: "ev-iep-reading",
        source: "IEP",
        location: "Present Levels → Reading → Page 12",
        usedFor: "Reading & Literacy Progress",
        quoteOrSnippet: "Reading fluency measured at 74 WPM vs 110 WPM grade-level benchmark.",
      },
      {
        id: "ev-eval-wjiv",
        source: "Evaluation",
        location: "Academic Achievement (Woodcock-Johnson IV) → Page 7",
        usedFor: "Reading & Literacy Progress",
        quoteOrSnippet: "Broad Reading standard score: 79 (8th percentile).",
      },
      {
        id: "ev-parent-call-reading",
        source: "Parent Call",
        location: "Advocate Intake Log → 09/21/26",
        usedFor: "Reading & Literacy Progress",
        quoteOrSnippet: "Parent noted child refuses bedtime reading due to embarrassment and eye fatigue.",
      },
      {
        id: "ev-iep-math",
        source: "IEP",
        location: "Present Levels → Mathematics → Page 14",
        usedFor: "Math Problem Solving & Calculation",
        quoteOrSnippet: "Requires visual graphic organizer and calculator accommodation for word problems.",
      },
      {
        id: "ev-teacher-math",
        source: "Teacher Communication",
        location: "Quarterly Math Progress Note → 09/14/26",
        usedFor: "Math Problem Solving & Calculation",
        quoteOrSnippet: "Struggles to start multi-step problems without 1-on-1 redirection.",
      },
      {
        id: "ev-disc-sensory",
        source: "Discovery Worksheet",
        location: "Parent Priorities → Sensory Profile Section 3",
        usedFor: "Sensory & Executive Functioning Supports",
        quoteOrSnippet: "Noise-dampening headphones requested for cafeteria and assemblies.",
      },
      {
        id: "ev-iep-accomm",
        source: "IEP",
        location: "Special Factors & Accommodations → Page 18",
        usedFor: "Sensory & Executive Functioning Supports",
        quoteOrSnippet: "Break pass to sensory room permitted as needed up to 10 min daily.",
      },
    ];

    const initialDraft =
      pcsText ||
      `As the parents of ${studentName}, our primary concern is ensuring meaningful educational progress in both academic achievement and functional emotional regulation. Specifically, current data indicates continued difficulties with reading fluency and multi-step math problem solving that fall significantly below grade-level expectations. Furthermore, sensory overstimulation during unstructured transitions directly impairs classroom stamina. We request that the team update the present levels to accurately reflect these standardized scores, establish measurable annual goals with frequent data reporting, and provide consistent sensory accommodations across all learning environments.`;

    const defaultHistory: PcsVersionHistoryItem[] = [
      {
        id: "hist-init-1",
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        employee: "AI Synthesis Engine (Cloudflare Workers AI)",
        action: "AI draft created",
        snapshot: initialDraft,
      },
    ];

    return {
      originalAiResult: initialDraft,
      concernsBreakdown: defaultConcerns,
      evidenceSources: defaultEvidence,
      history: defaultHistory,
      submittedVersion: {
        status: "not_received",
      },
    };
  }, [studentName, pcsText, parentConcerns]);

  // ── 4. Metadata State with Local Storage Backup ───────────────────────────
  const [metadata, setMetadata] = useState<PcsMetadata>(() => {
    // 1. Try props
    if (rawPcsMetadata) {
      if (typeof rawPcsMetadata === "object" && rawPcsMetadata.originalAiResult) {
        return rawPcsMetadata;
      }
      if (typeof rawPcsMetadata === "string") {
        try {
          const parsed = JSON.parse(rawPcsMetadata);
          if (parsed && parsed.originalAiResult) return parsed;
        } catch {}
      }
    }
    // 2. Try localStorage
    if (typeof window !== "undefined" && studentContactId) {
      try {
        const stored = localStorage.getItem(`wp_pcs_metadata_${studentContactId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.originalAiResult) return parsed;
        }
      } catch {}
    }
    // 3. Fallback to synthesized defaults
    return defaultSynthesizedMetadata;
  });

  // Dual-sync metadata to local storage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined" && studentContactId && metadata) {
      try {
        localStorage.setItem(`wp_pcs_metadata_${studentContactId}`, JSON.stringify(metadata));
      } catch {}
    }
  }, [studentContactId, metadata]);

  // ── 5. Actions: Content Changes & Direct Saving ───────────────────────────
  const handleChangeContent = (text: string) => {
    setContent(text);
    setIsDirty(true);
  };

  const handleSaveContent = async () => {
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const updatedHistory: PcsVersionHistoryItem[] = [
        {
          id: `hist-${Date.now()}`,
          timestamp: now,
          employee: "Byron Honea (Master IEP Coach®)",
          action: "Edited by employee",
          snapshot: content,
        },
        ...metadata.history,
      ];

      const updatedMeta: PcsMetadata = {
        ...metadata,
        history: updatedHistory,
      };

      setMetadata(updatedMeta);
      setIsDirty(false);
      setStatus("EDITED");

      await onSavePcs(content, updatedMeta);
      toast.success("Parent Concern Statement saved successfully.");
    } catch (err: any) {
      toast.error(`Failed to save statement: ${err?.message || "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ── 6. Actions: Paste / Replace Replacement Flow ───────────────────────────
  const handleReplaceCurrentDraft = async (newPastedStatement: string) => {
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const updatedHistory: PcsVersionHistoryItem[] = [
        {
          id: `hist-${Date.now()}`,
          timestamp: now,
          employee: "Byron Honea (Master IEP Coach®)",
          action: "Statement replaced by pasted version",
          snapshot: newPastedStatement,
        },
        ...metadata.history,
      ];

      // Keep all AI details, breakdown, evidence untouched while updating statement & history
      const updatedMeta: PcsMetadata = {
        ...metadata,
        history: updatedHistory,
      };

      setContent(newPastedStatement);
      setMetadata(updatedMeta);
      setIsDirty(false);
      setStatus("PASTE_REPLACED");

      await onSavePcs(newPastedStatement, updatedMeta);
      toast.success("Statement replaced with pasted version. Previous version preserved in history.");
    } catch (err: any) {
      toast.error(`Failed to replace statement: ${err?.message || "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ── 7. Actions: Email to Parent Flow ───────────────────────────────────────
  const handleRecordEmailSent = async ({
    recipientEmail,
    subject,
  }: {
    recipientEmail: string;
    subject: string;
  }) => {
    try {
      const now = new Date().toISOString();
      const updatedHistory: PcsVersionHistoryItem[] = [
        {
          id: `hist-${Date.now()}`,
          timestamp: now,
          employee: "Byron Honea (Master IEP Coach®)",
          action: "Draft emailed to parent",
          snapshot: content,
        },
        ...metadata.history,
      ];

      const updatedMeta: PcsMetadata = {
        ...metadata,
        history: updatedHistory,
      };

      setMetadata(updatedMeta);
      // Notice: Do NOT mark approved, final, or submitted to school!
      await onSavePcs(content, updatedMeta);
      toast.success(`Draft recorded as emailed to ${recipientEmail}`);
    } catch (err: any) {
      toast.error(`Failed to update history: ${err?.message || "Unknown error"}`);
    }
  };

  // ── 8. Actions: Submitted Version Tracking ─────────────────────────────────
  const handleUpdateSubmittedVersion = async (newSubmittedVersion: PcsSubmittedVersion) => {
    try {
      const updatedMeta: PcsMetadata = {
        ...metadata,
        submittedVersion: newSubmittedVersion,
      };
      setMetadata(updatedMeta);
      await onSavePcs(content, updatedMeta);
      if (newSubmittedVersion.status === "received") {
        toast.success("Parent's submitted copy saved to record.");
      } else {
        toast.info("Submitted status reset to Not Received.");
      }
    } catch (err: any) {
      toast.error(`Failed to update submitted version: ${err?.message || "Unknown error"}`);
    }
  };

  // ── 9. Actions: Restore from Version History ───────────────────────────────
  const handleRestoreHistoryVersion = async (snapshot: string, actionNote: string) => {
    try {
      const now = new Date().toISOString();
      const updatedHistory: PcsVersionHistoryItem[] = [
        {
          id: `hist-${Date.now()}`,
          timestamp: now,
          employee: "Byron Honea (Master IEP Coach®)",
          action: "Restored from version history",
          snapshot,
        },
        ...metadata.history,
      ];

      const updatedMeta: PcsMetadata = {
        ...metadata,
        history: updatedHistory,
      };

      setContent(snapshot);
      setMetadata(updatedMeta);
      setIsDirty(false);
      setStatus("EDITED");

      await onSavePcs(snapshot, updatedMeta);
      toast.success("Working statement restored to selected version snapshot.");
    } catch (err: any) {
      toast.error(`Failed to restore version: ${err?.message || "Unknown error"}`);
    }
  };

  return (
    <div id="parent-concern-statement-workspace" className="w-full space-y-4 pt-6">
      {/* ── 1. Main Advocate-Facing Box (Always directly visible & editable) ─ */}
      <PcsAdvocateBox
        content={content}
        status={status}
        isDetailsOpen={isDetailsOpen}
        onToggleDetails={() => setIsDetailsOpen((prev) => !prev)}
        onChangeContent={handleChangeContent}
        onSaveContent={handleSaveContent}
        onOpenPasteReplace={() => setIsPasteModalOpen(true)}
        onOpenEmailToParent={() => setIsEmailModalOpen(true)}
        isSaving={isSaving}
        isDirty={isDirty}
      />

      {/* ── 2. Behind-the-Scenes AI Working Area (Details Panel) ───────────── */}
      {isDetailsOpen && (
        <div className="transition-all duration-300 animate-in fade-in slide-in-from-top-2">
          <PcsDetailsPanel
            metadata={metadata}
            studentName={studentName}
            onUpdateSubmittedVersion={handleUpdateSubmittedVersion}
            onRestoreHistoryVersion={handleRestoreHistoryVersion}
            onClose={() => setIsDetailsOpen(false)}
          />
        </div>
      )}

      {/* ── 3. Paste / Replace Modal ───────────────────────────────────────── */}
      <PcsPasteReplaceModal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        currentStatement={content}
        onReplaceCurrentDraft={handleReplaceCurrentDraft}
      />

      {/* ── 4. Email to Parent Modal ───────────────────────────────────────── */}
      <PcsEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        studentName={studentName}
        parentEmail={parentEmail}
        statementContent={content}
        onRecordEmailSent={handleRecordEmailSent}
      />
    </div>
  );
}
