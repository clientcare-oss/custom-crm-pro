import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Layers,
  Trash2,
  Plus,
  Check,
  AlertTriangle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getDocketTotalPages,
  getBinderPageRange,
  getPageDisplayBadge,
  getNextExhibitLetter,
  type DocumentPage,
} from "@/pages/complaint/ComplaintWorkspace";

// Library of standard advocacy binders available to add into the complaint packet
export const STANDARD_ADVOCACY_BINDERS: Omit<DocumentPage, "number">[] = [
  {
    id: "clarity_control",
    title: "Clarity Control Restatement",
    category: "restatement",
    content: `BEFORE THE STATE DEPARTMENT OF EDUCATION
DIVISION FOR SPECIAL EDUCATION SERVICES AND SUPPORTS

CLARITY CONTROL RESTATEMENT OF ISSUES & STATUTORY VIOLATIONS
UNDER 34 C.F.R. § 300.153

COUNT I: FAILURE TO IMPLEMENT MANDATED IEP SERVICES & DENIAL OF FAPE
(34 C.F.R. § 300.323(c)(2))
The Local Educational Agency failed to implement the student's individualized education program as written by withholding mandated specialized instruction and accommodations.

COUNT II: FAILURE TO TIMELY EVALUATE & CHILD FIND VIOLATION
(34 C.F.R. § 300.111, § 300.301)
The LEA failed to timely evaluate the student following documented notice and parental requests.

COUNT III: UNLAWFUL REFUSAL TO ISSUE PRIOR WRITTEN NOTICE (PWN)
(34 C.F.R. § 300.503)
The LEA altered educational programming and refused evaluations without mandatory written notice.`,
  },
  {
    id: "chronological_summary",
    title: "Chronological Summary of Facts",
    category: "facts",
    content: `CHRONOLOGICAL SUMMARY OF RELEVANT FACTS & TIMELINE
(ALL EVENTS WITHIN 1-YEAR STATUTORY PERIOD · 34 C.F.R. § 300.153(c))

1. Operative IEP Baseline: The team developed the operative IEP detailing specialized instruction and related therapeutic services.
2. Parent Requests & Notice: Formal written requests were submitted regarding educational regression and unmet needs.
3. Service Withholding: Special education logs confirm scheduled sessions were canceled without compensatory scheduling.
4. Administrative Notice: Formal notice of non-compliance was delivered to school leadership.`,
  },
  {
    id: "exhibit_index",
    title: "Exhibit Index & Document Schedule",
    category: "pleading",
    content: `MASTER EXHIBIT INDEX & DOCUMENT SCHEDULE

EXHIBIT A: OPERATIVE IEP & SPECIALIZED INSTRUCTION SCHEDULE
EXHIBIT B: PSYCHOEDUCATIONAL EVALUATIONS & PARENT WRITTEN REQUESTS
EXHIBIT C: DISTRICT CORRESPONDENCE, SERVICE DELIVERY LOGS & PWN

All exhibits are sequentially tabbed and incorporated in direct support of Complainant's allegations.`,
  },
  {
    id: "student_impact",
    title: "Student Impact & Educational Regression",
    category: "pleading",
    content: `STUDENT IMPACT & DOCUMENTED EDUCATIONAL REGRESSION

1. ACADEMIC IMPACT:
Due to withheld instructional minutes and accommodations, the student demonstrated measurable academic deficit and lost educational ground.

2. EMOTIONAL & BEHAVIORAL CONSEQUENCES:
The persistent denial of required accommodations caused heightened anxiety, frustration, and avoidance behaviors.

3. REQUISITE COMPENSATORY RESTORATION:
Full compensatory 1-on-1 certified instruction is required to restore the student to the educational position they would have occupied absent the LEA's default.`,
  },
  {
    id: "pwn_procedural_log",
    title: "Prior Written Notice (PWN) Omission Log",
    category: "pleading",
    content: `PRIOR WRITTEN NOTICE (PWN) PROCEDURAL COMPLIANCE AUDIT
GOVERNING STATUTE: 34 C.F.R. § 300.503

The LEA repeatedly altered educational programming, refused parent requests, and adjusted service delivery without providing written explanation or mandatory statutory content required under 34 C.F.R. § 300.503(b).`,
  },
  {
    id: "compensatory_calculation",
    title: "Compensatory Education Calculation",
    category: "remedies",
    content: `PROPOSED COMPENSATORY EDUCATION CALCULATION & RELIEF SCHEDULE

1. Special Education Instruction:
- Missed specialized instruction: [X] hours
- Requested certified 1-on-1 compensatory tutoring: [X] hours

2. Related Therapeutic Services:
- Missed Speech-Language / OT sessions: [X] hours
- Requested compensatory therapy sessions: [X] hours

3. Independent Educational Evaluation (IEE):
- Full comprehensive psychoeducational and sensory evaluation funded at public expense.`,
  },
];

interface ManagePacketBindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  pages: DocumentPage[];
  onUpdatePages: (newPages: DocumentPage[]) => void;
  activePageId: string;
  onSelectPage: (pageId: string) => void;
  stateCode?: string;
  studentName?: string;
}

export const ManagePacketBindersModal: React.FC<ManagePacketBindersModalProps> = ({
  isOpen,
  onClose,
  pages,
  onUpdatePages,
  activePageId,
  onSelectPage,
  stateCode = "GA",
  studentName = "Student",
}) => {
  // Binder marked for deletion with Yes/No confirmation dialog
  const [binderPendingRemoval, setBinderPendingRemoval] = useState<{
    page: DocumentPage;
    index: number;
  } | null>(null);

  // New Custom Binder Name input
  const [customBinderTitle, setCustomBinderTitle] = useState("");
  const [isAddingCustom, setIsAddingCustom] = useState(false);

  // Keyboard shortcut: close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (binderPendingRemoval) {
          setBinderPendingRemoval(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, binderPendingRemoval, onClose]);

  if (!isOpen) return null;

  // Track standard binders not currently included in pages
  const availableStandardBinders = STANDARD_ADVOCACY_BINDERS.filter(
    (std) => !pages.some((p) => p.id === std.id)
  );

  // Handler: Confirm Removal of a Binder
  const handleConfirmRemove = () => {
    if (!binderPendingRemoval) return;
    const { page, index } = binderPendingRemoval;

    // Safety check: Don't remove the primary state form (cover) or required Clarity Control Restatement
    if (page.id === "cover") {
      toast.error("Binder 01 (Official State Form) is mandatory and cannot be removed.");
      setBinderPendingRemoval(null);
      return;
    }

    if (page.id === "clarity_control" || page.category === "restatement") {
      toast.error("The Clarity Control Restatement is a required pleading and cannot be removed from this complaint packet.");
      setBinderPendingRemoval(null);
      return;
    }

    const updatedPages = pages.filter((p) => p.id !== page.id);
    onUpdatePages(updatedPages);

    // If the removed page was currently active, switch to the preceding page
    if (activePageId === page.id) {
      const fallbackIdx = Math.max(0, index - 1);
      const fallbackPage = updatedPages[fallbackIdx] || updatedPages[0];
      if (fallbackPage) {
        onSelectPage(fallbackPage.id);
      }
    }

    toast.success(`Removed "${page.title}" from packet index. Page numbers updated.`);
    setBinderPendingRemoval(null);
  };

  // Handler: Add a standard binder back into the packet
  const handleAddStandardBinder = (std: Omit<DocumentPage, "number">) => {
    const nextIdx = pages.length;
    const nextNum = nextIdx + 1 < 10 ? `0${nextIdx + 1}` : `${nextIdx + 1}`;

    const newPage: DocumentPage = {
      ...std,
      number: nextNum,
    };

    const updatedPages = [...pages, newPage];
    onUpdatePages(updatedPages);
    onSelectPage(newPage.id);
    toast.success(`Added "${std.title}" to packet index as Binder ${nextNum}.`);
  };

  // Handler: Add a new Exhibit Binder
  const handleAddExhibitBinder = () => {
    const nextLetter = getNextExhibitLetter(pages);
    const nextIdx = pages.length;
    const nextNum = nextIdx + 1 < 10 ? `0${nextIdx + 1}` : `${nextIdx + 1}`;

    const newExhibit: DocumentPage = {
      id: `exhibit_${nextLetter.toLowerCase()}_${Date.now()}`,
      number: nextNum,
      title: `Exhibit ${nextLetter} (Evidentiary Record)`,
      category: "exhibit",
      exhibitTag: `Exhibit ${nextLetter}`,
      content: `EXHIBIT ${nextLetter} · EVIDENTIARY RECORD\n\nThis evidentiary exhibit is incorporated in formal support of Complainant's state complaint claims.`,
    };

    const updatedPages = [...pages, newExhibit];
    onUpdatePages(updatedPages);
    onSelectPage(newExhibit.id);
    toast.success(`Added Exhibit ${nextLetter} as Binder ${nextNum}. Page numbers updated.`);
  };

  // Handler: Add a custom user-defined binder
  const handleAddCustomBinder = () => {
    if (!customBinderTitle.trim()) return;

    const nextIdx = pages.length;
    const nextNum = nextIdx + 1 < 10 ? `0${nextIdx + 1}` : `${nextIdx + 1}`;

    const newPage: DocumentPage = {
      id: `custom_${Date.now()}`,
      number: nextNum,
      title: customBinderTitle.trim(),
      category: "pleading",
      content: `DOCUMENT SECTION: ${customBinderTitle.toUpperCase()}\n\nEnter formal legal statement, factual chronology, or evidentiary proffer here...`,
    };

    const updatedPages = [...pages, newPage];
    onUpdatePages(updatedPages);
    onSelectPage(newPage.id);
    setCustomBinderTitle("");
    setIsAddingCustom(false);
    toast.success(`Added "${newPage.title}" as Binder ${nextNum}. Page numbers updated.`);
  };

  const totalPages = getDocketTotalPages(pages);

  return (
    <>
      {/* ── MAIN MANAGE PACKET BINDERS MODAL OVERLAY ────────────────────────── */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
        <div
          className={cn(
            "w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl overflow-hidden border shadow-2xl transition-all",
            "bg-[#041329] border-[#C5A059]/70 text-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.08)]"
          )}
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(8, 32, 66, 0.98) 0%, rgba(4, 19, 41, 0.98) 100%), url('/decor/folio-leather-texture.png')",
            backgroundRepeat: "repeat",
            backgroundSize: "220px",
          }}
        >
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-[#3A2C18] flex items-center justify-between bg-gradient-to-r from-[#071C3A] via-[#0A264D] to-[#071C3A] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#DFBE77] to-[#9E7D3B] p-0.5 flex items-center justify-center shadow-md shrink-0">
                <div className="w-full h-full bg-[#05142B] rounded-[6px] flex items-center justify-center text-[#FFE394]">
                  <Layers className="w-4 h-4 text-[#FFE394]" />
                </div>
              </div>
              <div className="text-left min-w-0">
                <div className="font-serif font-bold text-sm sm:text-base text-[#FFF4D4] tracking-wide flex items-center gap-2">
                  <span>Packet Index Binders</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#031124] text-[#FFE394] border border-[#C5A059]/40 shrink-0">
                    {pages.length} Binders · {totalPages} Pages
                  </span>
                </div>
                <p className="text-[11px] text-[#C6B697] truncate max-w-md mt-0.5">
                  Choose which binders to include or remove. Page numbers automatically re-sequence.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#C6B697] hover:text-[#FFF4D4] hover:bg-white/10 transition-colors cursor-pointer shrink-0 ml-2"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4.5 custom-scrollbar">
            {/* Section 1: Included Binders in Active Docket */}
            <div className="flex flex-col gap-2 shrink-0">
              <div className="flex items-center justify-between pb-1">
                <span className="font-serif font-bold text-xs text-[#FFF4D4] flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Currently Included Binders ({pages.length})</span>
                </span>
                <span className="text-[10px] text-[#A69371] italic">
                  Drag & ordering matches filing sequence
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {pages.map((p, index) => {
                  const range = getBinderPageRange(index, pages);
                  const displayNum = getPageDisplayBadge(p, index);
                  const isCover = p.id === "cover";
                  const isClarityControl = p.id === "clarity_control" || p.category === "restatement";
                  const isMandatory = isCover || isClarityControl;

                  return (
                    <div
                      key={p.id}
                      className={cn(
                        "shrink-0 min-h-[56px] flex items-center justify-between p-3 rounded-lg border transition-all text-xs",
                        p.id === activePageId
                          ? "bg-[#0A264D]/90 border-[#DFBE77] shadow-[0_0_12px_rgba(223,190,119,0.25)]"
                          : "bg-[#020A17]/85 border-[#3A2C18] hover:border-[#C5A059]/60"
                      )}
                    >
                      {/* Left: Binder badge + title + category */}
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                        <span className="font-mono text-xs font-bold text-[#FFE394] bg-[#031124] border border-[#C5A059]/50 w-8 h-7 rounded flex items-center justify-center shrink-0 shadow-inner">
                          {displayNum}
                        </span>

                        <div className="min-w-0 flex-1 flex flex-col justify-center">
                          <div className="flex items-center gap-2">
                            <span className="font-serif font-bold text-[#FFF4D4] truncate block">
                              {p.title}
                            </span>
                            {isCover && (
                              <span className="text-[9px] font-sans font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-700/60 shrink-0">
                                Required Form
                              </span>
                            )}
                            {isClarityControl && (
                              <span className="text-[9px] font-sans font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-700/60 shrink-0">
                                Required Pleading
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-[#A69371] mt-1 leading-none">
                            <span className="uppercase tracking-wider font-mono font-semibold text-[#DFBE77]">
                              Pages {range.badge}
                            </span>
                            <span className="text-[#5A4830]">·</span>
                            <span className="capitalize">{p.category}</span>
                            {p.renderedPages && p.renderedPages.length > 0 && (
                              <>
                                <span className="text-[#5A4830]">·</span>
                                <span className="text-[#FFE394]">
                                  {p.renderedPages.length} PDF Pages
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectPage(p.id);
                            onClose();
                          }}
                          className="px-2.5 py-1 rounded text-xs font-semibold text-[#DFBE77] hover:text-[#FFF4D4] hover:bg-white/[0.08] transition-colors cursor-pointer"
                          title="Jump to this binder in workspace"
                        >
                          View
                        </button>

                        {/* Remove button (disabled on mandatory state form & clarity control restatement) */}
                        {!isMandatory ? (
                          <button
                            type="button"
                            onClick={() => setBinderPendingRemoval({ page: p, index })}
                            className="p-1.5 rounded text-rose-400 hover:text-rose-200 hover:bg-rose-950/60 border border-rose-900/40 hover:border-rose-700/60 transition-colors cursor-pointer"
                            title={`Remove "${p.title}" from packet`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span
                            className="p-1.5 text-slate-500 opacity-40 cursor-not-allowed"
                            title={
                              isCover
                                ? "State Form 01 is mandatory and cannot be removed"
                                : "The Clarity Control Restatement is a required pleading and cannot be removed"
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Available Binders to Add */}
            <div className="flex flex-col gap-2 pt-3 border-t border-[#3A2C18] shrink-0">
              <div className="flex items-center justify-between pb-0.5">
                <span className="font-serif font-bold text-xs text-[#FFE394]">
                  Standard Advocacy Binders to Add
                </span>
                <span className="text-[10px] text-[#C6B697] font-sans font-normal">
                  Click to add into packet
                </span>
              </div>

              {availableStandardBinders.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {availableStandardBinders.map((std) => (
                    <div
                      key={std.id}
                      className="shrink-0 min-h-[54px] p-2.5 rounded-lg bg-[#020A17]/80 border border-[#3A2C18] flex items-center justify-between gap-2.5 hover:border-[#C5A059]/60 transition-all text-xs"
                    >
                      <div className="min-w-0 flex-1 flex flex-col justify-center">
                        <span className="font-serif font-bold text-[#E8DCC2] truncate block">
                          {std.title}
                        </span>
                        <span className="text-[10px] text-[#A69371] capitalize block mt-0.5">
                          {std.category} · Standard Template
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddStandardBinder(std)}
                        className="px-2.5 py-1.5 rounded text-xs font-serif font-bold bg-[#071C3A] text-[#FFE394] hover:bg-[#0A2E5C] border border-[#C5A059]/50 hover:border-[#FFE394] transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-[#020A17]/40 border border-[#3A2C18]/60 text-center text-xs text-[#A69371]">
                  All standard advocacy binders are currently included in this docket packet.
                </div>
              )}
            </div>

            {/* Section 3: Add Additional Exhibit or Custom Section */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#3A2C18] shrink-0">
              {isAddingCustom ? (
                <div className="flex items-center gap-2 w-full">
                  <input
                    type="text"
                    value={customBinderTitle}
                    onChange={(e) => setCustomBinderTitle(e.target.value)}
                    placeholder="Enter custom binder title (e.g., Speech Therapy Service Logs)..."
                    className="flex-1 bg-[#020A17] border border-[#C5A059] text-xs text-[#FFF4D4] px-3 py-1.5 rounded-md focus:outline-none placeholder:text-[#6E5D43]"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddCustomBinder();
                      if (e.key === "Escape") setIsAddingCustom(false);
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddCustomBinder}
                    disabled={!customBinderTitle.trim()}
                    className="bg-gradient-to-r from-[#DFBE77] to-[#C5A059] text-[#07162B] font-bold text-xs h-8 px-3"
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddingCustom(false)}
                    className="border-[#3A2C18] text-[#C6B697] text-xs h-8 px-2"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 w-full justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddExhibitBinder}
                      className="bg-[#051A38] text-[#DFBE77] hover:text-[#FFF4D4] hover:bg-[#07244D] border border-[#C5A059]/60 text-xs h-8 gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#FFE394]" />
                      <span>Add Exhibit Binder ({`Exhibit ${getNextExhibitLetter(pages)}`})</span>
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setIsAddingCustom(true)}
                      className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] text-xs h-8 gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Custom Binder</span>
                    </Button>
                  </div>

                  <span className="text-[11px] text-[#A69371] italic hidden sm:inline">
                    Continuous docket re-numbers from 01 to {pages.length < 10 ? `0${pages.length}` : pages.length}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-5 py-3 border-t border-[#3A2C18] flex items-center justify-between bg-[#031124] shrink-0">
            <span className="text-xs text-[#A69371] font-mono">
              Filing Packet: {pages.length} Binders · Total {totalPages} Pages
            </span>

            <Button
              type="button"
              onClick={onClose}
              className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-serif font-bold text-xs h-8 px-5 hover:brightness-110 cursor-pointer shadow-md"
            >
              Done & Save Packet
            </Button>
          </div>
        </div>
      </div>

      {/* ── EXPLICIT YES / NO REMOVAL CONFIRMATION DIALOG OVERLAY ─────────── */}
      {binderPendingRemoval && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-md p-5 rounded-xl border border-[#C5A059]/80 bg-[#07162B] text-slate-100 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(14, 42, 82, 0.98) 0%, rgba(7, 22, 43, 0.98) 100%), url('/decor/folio-leather-texture.png')",
              backgroundRepeat: "repeat",
              backgroundSize: "220px",
            }}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-950/80 border border-rose-600/60 flex items-center justify-center text-rose-400 shrink-0 shadow-lg">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>

              <div className="text-left flex-1 min-w-0">
                <h4 className="font-serif font-bold text-base text-[#FFF4D4]">
                  Remove Binder from Packet?
                </h4>
                <p className="text-xs text-[#C6B697] mt-1.5 leading-relaxed">
                  Are you sure you want to remove{" "}
                  <span className="text-[#FFE394] font-bold">
                    "{binderPendingRemoval.page.title}"
                  </span>{" "}
                  from the state complaint packet?
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#020A17]/80 border border-[#3A2C18] text-xs text-[#A69371] leading-relaxed">
              <span className="text-[#FFE394] font-medium block mb-1">
                ✓ Automatic Page Renumbering Guarantee:
              </span>
              All remaining binders and continuous docket page numbers will automatically shift up and recalculate without gaps. You can re-add this binder anytime from the packet manager.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#3A2C18]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBinderPendingRemoval(null)}
                className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] text-xs h-8 cursor-pointer"
              >
                No, Keep Binder
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleConfirmRemove}
                className="bg-rose-600 hover:bg-rose-500 text-white font-serif font-bold text-xs h-8 px-4 shadow-md transition-all cursor-pointer"
              >
                Yes, Remove Binder
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
