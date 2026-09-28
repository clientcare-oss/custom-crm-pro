import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Printer, Copy, Check, FileText, Download, ShieldCheck, AlertCircle } from "lucide-react";
import { LawyerPrepSnapshot } from "./types";
import { toast } from "sonner";

interface AttorneyPacketModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: LawyerPrepSnapshot;
  studentName: string;
  attorneyName?: string | null;
  attorneyFirm?: string | null;
  generatedDate?: string;
  onSaveSelection?: (selected: string[]) => void;
}

const AVAILABLE_SECTIONS = [
  { id: "caseSnapshot", label: "Case Snapshot & Profile", defaultChecked: true },
  { id: "primaryIssues", label: "Primary Unresolved Issues", defaultChecked: true },
  { id: "keyTimeline", label: "Key Case Chronology Timeline", defaultChecked: true },
  { id: "requestsAndResponses", label: "Parent Requests vs. District Responses", defaultChecked: true },
  { id: "potentialLegalIssues", label: "Potential Compliance & Procedural Issues", defaultChecked: true },
  { id: "evidenceIndex", label: "Evidence Index & Document Registry", defaultChecked: true },
  { id: "recordConflicts", label: "Documented Record Inconsistencies", defaultChecked: true },
  { id: "missingInformation", label: "Missing Information & Records Checklist", defaultChecked: true },
  { id: "questionsForAttorney", label: "Evaluative Questions for Legal Counsel", defaultChecked: true },
  { id: "advocateNotes", label: "Waypoint Advocate Notes & Directives", defaultChecked: true },
];

export function AttorneyPacketModal({
  isOpen,
  onClose,
  snapshot,
  studentName,
  attorneyName,
  attorneyFirm,
  generatedDate = new Date().toLocaleDateString(),
  onSaveSelection,
}: AttorneyPacketModalProps) {
  const [selectedSections, setSelectedSections] = useState<string[]>(
    AVAILABLE_SECTIONS.map((s) => s.id)
  );
  const [copied, setCopied] = useState(false);

  const toggleSection = (id: string) => {
    setSelectedSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedSections.length === AVAILABLE_SECTIONS.length) {
      setSelectedSections([]);
    } else {
      setSelectedSections(AVAILABLE_SECTIONS.map((s) => s.id));
    }
  };

  const generateFormattedText = () => {
    let out = `WAYPOINT ADVOCATES — ATTORNEY CASE PACKET\n`;
    out += `CONFIDENTIAL & PRIVILEGED WORK PRODUCT\n`;
    out += `=====================================================\n`;
    out += `Student: ${studentName}\n`;
    out += `Prepared For: ${attorneyName || "Legal Counsel"} (${attorneyFirm || "Legal Firm"})\n`;
    out += `Lead Advocate: Byron Honea, Master IEP Coach®\n`;
    out += `Date: ${generatedDate}\n`;
    out += `=====================================================\n\n`;

    if (selectedSections.includes("caseSnapshot")) {
      out += `1. CASE SNAPSHOT\n----------------\n`;
      out += `Student: ${snapshot.caseSnapshot.studentName}\n`;
      out += `Age / Grade: ${snapshot.caseSnapshot.age} | ${snapshot.caseSnapshot.grade}\n`;
      out += `School / District: ${snapshot.caseSnapshot.school} | ${snapshot.caseSnapshot.district}\n`;
      out += `IEP Eligibility: ${snapshot.caseSnapshot.eligibility}\n`;
      out += `Medical Diagnoses: ${snapshot.caseSnapshot.medicalDiagnoses}\n`;
      out += `Placement: ${snapshot.caseSnapshot.currentPlacement}\n`;
      out += `Plan Status: ${snapshot.caseSnapshot.planStatus}\n`;
      out += `Date of Recent IEP: ${snapshot.caseSnapshot.dateOfRecentIep}\n\n`;
    }

    if (selectedSections.includes("primaryIssues")) {
      out += `2. PRIMARY UNRESOLVED ISSUES\n----------------------------\n`;
      snapshot.primaryIssues.forEach((issue, idx) => {
        out += `${idx + 1}. [${issue.severity.toUpperCase()}] ${issue.title} (${issue.status})\n`;
        out += `   Summary: ${issue.summary}\n`;
        out += `   Sources: ${issue.evidenceSources.join(", ")}\n\n`;
      });
    }

    if (selectedSections.includes("keyTimeline")) {
      out += `3. KEY CASE TIMELINE\n--------------------\n`;
      snapshot.keyTimeline.forEach((t) => {
        out += `• ${t.date} — ${t.event} [Status: ${t.status}]\n`;
        out += `  What Happened: ${t.whatHappened}\n`;
        out += `  Evidence: ${t.evidence}\n\n`;
      });
    }

    if (selectedSections.includes("requestsAndResponses")) {
      out += `4. PARENT REQUESTS VS. SCHOOL RESPONSES\n---------------------------------------\n`;
      snapshot.requestsAndResponses.forEach((r, idx) => {
        out += `Request ${idx + 1} (${r.date}): ${r.request}\n`;
        out += `School Response: ${r.schoolResponse} [Status: ${r.status}]\n`;
        out += `Evidence: ${r.evidence}\n\n`;
      });
    }

    if (selectedSections.includes("potentialLegalIssues")) {
      out += `5. POTENTIAL ISSUES FOR ATTORNEY REVIEW\n---------------------------------------\n`;
      snapshot.potentialLegalIssues.forEach((p, idx) => {
        out += `${idx + 1}. ${p.legalLevel}: ${p.issue}\n`;
        out += `   Why Flagged: ${p.whyFlagged}\n`;
        out += `   Relevant Law/Rule: ${p.relevantLegalArea}\n`;
        out += `   Supporting Evidence: ${p.supportingEvidence.join(", ")}\n`;
        out += `   Missing Evidence: ${p.missingEvidence}\n\n`;
      });
    }

    if (selectedSections.includes("evidenceIndex")) {
      out += `6. EVIDENCE INDEX & DOCUMENT REGISTRY\n-------------------------------------\n`;
      snapshot.evidenceIndex.forEach((cat) => {
        out += `[${cat.category}]\n`;
        cat.items.forEach((item) => {
          out += `  • ${item.name} (${item.date}) ${item.notes ? `- ${item.notes}` : ""}\n`;
        });
        out += `\n`;
      });
    }

    if (selectedSections.includes("recordConflicts")) {
      out += `7. RECORD CONFLICTS & INCONSISTENCIES\n--------------------------------------\n`;
      snapshot.recordConflicts.forEach((c, idx) => {
        out += `${idx + 1}. ${c.conflictTitle}\n`;
        out += `   Source A (${c.sourceA.title}): "${c.sourceA.statement}"\n`;
        out += `   Source B (${c.sourceB.title}): "${c.sourceB.statement}"\n`;
        out += `   Implication: ${c.implication}\n\n`;
      });
    }

    if (selectedSections.includes("missingInformation")) {
      out += `8. MISSING INFORMATION & RECORDS CHECKLIST\n------------------------------------------\n`;
      snapshot.missingInformation.forEach((m) => {
        out += `[${m.checklistStatus.toUpperCase()}] ${m.item} (${m.importance})\n`;
        out += `  Why Needed: ${m.whyNeeded}\n`;
      });
      out += `\n`;
    }

    if (selectedSections.includes("questionsForAttorney")) {
      out += `9. QUESTIONS FOR LEGAL COUNSEL\n------------------------------\n`;
      snapshot.questionsForAttorney.forEach((q, idx) => {
        out += `${idx + 1}. ${q.question}\n`;
        out += `   Context: ${q.context}\n`;
        out += `   Relevant Docs: ${q.relevantDocs}\n\n`;
      });
    }

    if (selectedSections.includes("advocateNotes")) {
      out += `10. WAYPOINT ADVOCATE NOTES & DIRECTIVES\n----------------------------------------\n`;
      out += `${snapshot.advocateNotes || "No specific advocate notes recorded."}\n\n`;
    }

    out += `NOTICE: This document is an informational work product prepared by special education advocacy staff. It does not constitute legal advice or formal attorney-client communication unless independently reviewed by retained legal counsel.\n`;

    return out;
  };

  const handleCopy = () => {
    const text = generateFormattedText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Attorney Case Packet copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-[#07162B] border-[#0E3E75] text-slate-100 p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="pb-3 border-b border-[#0E3E75]/80">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#F5B544]/20 border border-[#F5B544]/40 flex items-center justify-center text-[#F5B544]">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Export Attorney Case Packet</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F5B544]/20 text-[#F5B544] border border-[#F5B544]/40">
                    PG-030-LP
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300">
                  Select which sections to include in the formal case summary for <strong className="text-white">{attorneyName || "Legal Counsel"}</strong>.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-amber-300/80 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Advocate-controlled export</span>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Section Selection Checkboxes */}
          <div className="rounded-xl border border-[#0E3E75] bg-[#0B2144]/60 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#0E3E75]/60">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Include in Attorney Packet
              </span>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-[#38BDF8] hover:underline font-semibold cursor-pointer"
              >
                {selectedSections.length === AVAILABLE_SECTIONS.length ? "Deselect All" : "Select All (10)"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {AVAILABLE_SECTIONS.map((sec) => (
                <label
                  key={sec.id}
                  className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                    selectedSections.includes(sec.id)
                      ? "bg-[#0E3E75]/40 border-[#38BDF8]/40 text-white font-medium"
                      : "bg-[#07162B]/50 border-[#0E3E75]/40 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Checkbox
                    checked={selectedSections.includes(sec.id)}
                    onCheckedChange={() => toggleSection(sec.id)}
                  />
                  <span>{sec.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Formatted Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-300">Packet Text Preview</Label>
              <span className="text-[11px] text-slate-400 font-mono">
                {selectedSections.length} of {AVAILABLE_SECTIONS.length} sections active
              </span>
            </div>
            <div className="rounded-xl border border-[#0E3E75] bg-[#030D1A] p-4 text-xs font-mono text-slate-200 max-h-[300px] overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
              {generateFormattedText()}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-200/90 leading-snug">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Privacy Guard:</strong> Nothing is ever transmitted or emailed automatically. You maintain full custody of this packet and decide what to share with legal counsel.
            </span>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-[#0E3E75]/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 h-8"
          >
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="text-xs border-[#0E3E75] bg-[#0B2144] hover:bg-[#124278] text-white h-8 px-3.5 font-semibold"
            >
              {copied ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
              {copied ? "Copied!" : "Copy Packet"}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="text-xs font-bold bg-[#F5B544] hover:bg-[#F5B544]/90 text-slate-950 h-8 px-4 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5 text-slate-950" />
              Print / Save PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
