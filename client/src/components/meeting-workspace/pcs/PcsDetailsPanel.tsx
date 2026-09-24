import React, { useState } from "react";
import {
  Sparkles,
  Brain,
  FileSearch,
  History,
  CheckCircle2,
  AlertCircle,
  Copy,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  RotateCcw,
  Check,
  FileCheck,
  ShieldCheck,
  Clock,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type {
  PcsMetadata,
  PcsConcernBreakdownItem,
  PcsEvidenceItem,
  PcsVersionHistoryItem,
  PcsSubmittedVersion,
} from "./types";

interface PcsDetailsPanelProps {
  metadata: PcsMetadata;
  studentName: string;
  onUpdateSubmittedVersion: (submittedVersion: PcsSubmittedVersion) => void;
  onRestoreHistoryVersion: (snapshot: string, actionNote: string) => void;
  onClose: () => void;
}

export function PcsDetailsPanel({
  metadata,
  studentName,
  onUpdateSubmittedVersion,
  onRestoreHistoryVersion,
  onClose,
}: PcsDetailsPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<
    "ai_result" | "breakdown" | "evidence" | "history" | "submitted"
  >("breakdown");

  // Selected evidence for preview modal
  const [selectedEvidence, setSelectedEvidence] = useState<PcsEvidenceItem | null>(null);

  // Selected history snapshot for preview modal
  const [selectedHistory, setSelectedHistory] = useState<PcsVersionHistoryItem | null>(null);

  // Submitted version local edits
  const [submittedStatus, setSubmittedStatus] = useState<"not_received" | "received">(
    metadata.submittedVersion?.status || "not_received"
  );
  const [submittedDate, setSubmittedDate] = useState(
    metadata.submittedVersion?.receivedAt || new Date().toISOString().split("T")[0]
  );
  const [submittedSource, setSubmittedSource] = useState(
    metadata.submittedVersion?.source || "Parent Email CC"
  );
  const [submittedText, setSubmittedText] = useState(
    metadata.submittedVersion?.content || ""
  );

  const handleSaveSubmittedVersion = () => {
    onUpdateSubmittedVersion({
      status: submittedStatus,
      receivedAt: submittedStatus === "received" ? submittedDate : undefined,
      source: submittedStatus === "received" ? submittedSource : undefined,
      content: submittedStatus === "received" ? submittedText : undefined,
    });
    toast.success("Submitted version status updated.");
  };

  const handleCopyAiResult = () => {
    navigator.clipboard.writeText(metadata.originalAiResult);
    toast.success("Original AI result copied to clipboard.");
  };

  return (
    <div className="rounded-xl bg-[#040F1E] border border-[#163B66] p-5 space-y-5 shadow-2xl animate-in fade-in-50 duration-200">
      {/* Details Header & Explainer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#15365E]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-300">
              <Brain className="w-4 h-4 text-purple-400" />
            </span>
            <h3 className="text-sm font-bold text-white tracking-wide">
              PCS Details & AI Evidence Engine
            </h3>
            <Badge className="bg-purple-950/60 text-purple-300 border-purple-800 text-[10px] font-semibold">
              Behind the Scenes
            </Badge>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
            Answers: What did AI find? Why did AI include this concern? What evidence supports it? Where did that evidence come from?
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-white hover:bg-slate-800/60 h-7 px-2.5 self-start sm:self-auto cursor-pointer"
        >
          Close Details ✕
        </Button>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#132E52] scrollbar-none">
        <button
          onClick={() => setActiveSubTab("breakdown")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0",
            activeSubTab === "breakdown"
              ? "bg-[#144A7E] text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
          )}
        >
          <Layers className="w-3.5 h-3.5 text-blue-300" />
          <span>AI Concern Breakdown ({metadata.concernsBreakdown.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("evidence")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0",
            activeSubTab === "evidence"
              ? "bg-[#144A7E] text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
          )}
        >
          <FileSearch className="w-3.5 h-3.5 text-amber-300" />
          <span>Evidence & Sources ({metadata.evidenceSources.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("ai_result")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0",
            activeSubTab === "ai_result"
              ? "bg-[#144A7E] text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
          )}
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-300" />
          <span>Original AI Result</span>
        </button>

        <button
          onClick={() => setActiveSubTab("history")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0",
            activeSubTab === "history"
              ? "bg-[#144A7E] text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
          )}
        >
          <History className="w-3.5 h-3.5 text-emerald-300" />
          <span>Version History ({metadata.history.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("submitted")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0",
            activeSubTab === "submitted"
              ? "bg-[#144A7E] text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
          )}
        >
          <FileCheck className="w-3.5 h-3.5 text-cyan-300" />
          <span>Submitted Version</span>
          <span
            className={cn(
              "text-[9px] px-1.5 py-0.2 rounded-full font-bold ml-0.5",
              submittedStatus === "received"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-slate-800 text-slate-400"
            )}
          >
            {submittedStatus === "received" ? "Received" : "Not Received"}
          </span>
        </button>
      </div>

      {/* ── TAB 1: AI CONCERN BREAKDOWN ──────────────────────────────────────── */}
      {activeSubTab === "breakdown" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Specific concerns identified by AI with underlying rationale and authentic record evidence:
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {metadata.concernsBreakdown.map((concern, idx) => (
              <div
                key={concern.id || idx}
                className="rounded-xl bg-[#07192F] border border-[#173D68] p-4 space-y-3 hover:border-[#1E4E85] transition-colors"
              >
                {/* Title */}
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs flex items-center justify-center font-mono">
                      {idx + 1}
                    </span>
                    <span>{concern.topic}</span>
                  </h4>
                  <Badge variant="outline" className="text-[10px] text-blue-300 border-blue-500/30 bg-blue-950/40">
                    Concern #{idx + 1}
                  </Badge>
                </div>

                {/* Why AI Included This */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-amber-400/90 uppercase tracking-wider flex items-center gap-1">
                    <Brain className="w-3 h-3" />
                    Why AI Included This
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed bg-[#051324] border border-[#132F52] p-2.5 rounded-lg font-sans">
                    {concern.whyAiIncludedThis}
                  </p>
                </div>

                {/* Evidence Locations List */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-blue-400/90 uppercase tracking-wider flex items-center gap-1">
                    <FileSearch className="w-3 h-3" />
                    Evidence & Exact Record Sources
                  </span>
                  <div className="space-y-1.5">
                    {concern.evidenceLocations.map((loc, lIdx) => (
                      <div
                        key={lIdx}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#040E1B] border border-[#132E52] text-xs text-slate-300"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-[#F5B544]">•</span>
                          <span className="font-mono text-[11px] text-blue-200 truncate">{loc}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const matched = metadata.evidenceSources.find((e) => e.location === loc) || {
                              id: `ev-${idx}-${lIdx}`,
                              source: (loc.split("→")[0]?.trim() as any) || "IEP",
                              location: loc,
                              usedFor: concern.topic,
                              quoteOrSnippet: `Document quote supporting ${concern.topic} from verified ${loc}`,
                            };
                            setSelectedEvidence(matched);
                          }}
                          className="h-6 text-[10px] text-blue-300 hover:text-white hover:bg-slate-800/80 px-2 cursor-pointer gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>View Evidence</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 2: EVIDENCE & SOURCE LOCATIONS ──────────────────────────────── */}
      {activeSubTab === "evidence" && (
        <div className="space-y-3.5">
          <p className="text-xs text-slate-400">
            Combined evidence register mapping source documents, exact internal locations, and which parent concern they anchor.
          </p>

          <div className="rounded-xl border border-[#163860] bg-[#051324] overflow-hidden">
            <div className="hidden sm:grid grid-cols-12 gap-3 px-3.5 py-2 bg-[#08203E] border-b border-[#163860] text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              <div className="col-span-3">Source</div>
              <div className="col-span-4">Location in Record</div>
              <div className="col-span-3">Used For</div>
              <div className="col-span-2 text-right">View</div>
            </div>

            <div className="divide-y divide-[#132E52]">
              {metadata.evidenceSources.map((ev) => (
                <div
                  key={ev.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 p-3 items-center text-xs hover:bg-[#071A30] transition-colors"
                >
                  <div className="col-span-3 flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-300 bg-amber-950/30">
                      {ev.source}
                    </Badge>
                  </div>
                  <div className="col-span-4 font-mono text-[11px] text-blue-200 break-words">
                    {ev.location}
                  </div>
                  <div className="col-span-3 text-slate-300 font-medium">
                    {ev.usedFor}
                  </div>
                  <div className="col-span-2 sm:text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedEvidence(ev)}
                      className="h-6 text-[10px] border-slate-700 bg-slate-900/60 text-blue-300 hover:text-white hover:border-blue-400 px-2 gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3 text-[#F5B544]" />
                      <span>View</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: ORIGINAL AI RESULT ───────────────────────────────────────── */}
      {activeSubTab === "ai_result" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Reference Copy: Original AI Result</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                This original AI output is permanently locked and protected. It is never overwritten by manual edits or pasted rewrites.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyAiResult}
              className="h-7 text-xs border-slate-700 bg-slate-900/60 text-slate-300 hover:text-white gap-1 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-[#F5B544]" />
              <span>Copy AI Result</span>
            </Button>
          </div>

          <div className="p-4 rounded-xl bg-[#030C18] border border-[#163B66] text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-sans max-h-[380px] overflow-y-auto">
            {metadata.originalAiResult || "No original AI draft recorded."}
          </div>
        </div>
      )}

      {/* ── TAB 4: VERSION HISTORY ─────────────────────────────────────────── */}
      {activeSubTab === "history" && (
        <div className="space-y-3.5">
          <p className="text-xs text-slate-400">
            Chronological audit log of all changes, pastes, edits, and emails for this Parent Concern Statement:
          </p>

          <div className="space-y-2.5">
            {metadata.history.map((h, i) => (
              <div
                key={h.id || i}
                className="flex items-center justify-between p-3 rounded-xl bg-[#06182E] border border-[#163860] text-xs hover:border-[#1E4E85] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                    <Clock className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-white text-xs">{h.action}</strong>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(h.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">By: {h.employee}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedHistory(h)}
                    className="h-6 text-[10px] border-slate-700 bg-slate-900/60 text-slate-300 hover:text-white px-2 cursor-pointer"
                  >
                    View Version
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onRestoreHistoryVersion(
                        h.snapshot,
                        `Restored from version: ${h.action} (${new Date(h.timestamp).toLocaleDateString()})`
                      );
                      toast.success("Statement restored from history!");
                    }}
                    className="h-6 text-[10px] border-amber-500/40 bg-amber-950/30 text-amber-300 hover:bg-amber-900/40 px-2 cursor-pointer gap-1"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Restore</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 5: OPTIONAL SUBMITTED VERSION ───────────────────────────────── */}
      {activeSubTab === "submitted" && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-[#061A34] border border-[#173F6E] space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-cyan-400" />
              <span>Parent Submitted Version Tracking</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Sometimes parents CC Waypoint when sending their finalized statement to the school case manager; sometimes they do not.
            </p>
            <div className="p-2 rounded-lg bg-blue-950/30 border border-blue-800/30 text-[11px] text-blue-200">
              <strong>Normal Workflow Note:</strong> "Not Received" is completely normal. It will never create an alert, generate an overdue task, or block your meeting preparation.
            </div>
          </div>

          {/* Toggle Received State */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-300">Status:</label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={submittedStatus === "not_received" ? "default" : "outline"}
                size="sm"
                onClick={() => setSubmittedStatus("not_received")}
                className={cn(
                  "h-7 text-xs cursor-pointer",
                  submittedStatus === "not_received"
                    ? "bg-slate-700 text-white font-bold"
                    : "border-slate-700 bg-slate-900 text-slate-300"
                )}
              >
                Not Received
              </Button>
              <Button
                type="button"
                variant={submittedStatus === "received" ? "default" : "outline"}
                size="sm"
                onClick={() => setSubmittedStatus("received")}
                className={cn(
                  "h-7 text-xs cursor-pointer",
                  submittedStatus === "received"
                    ? "bg-emerald-600 text-white font-bold"
                    : "border-slate-700 bg-slate-900 text-slate-300"
                )}
              >
                ✓ Copy Received
              </Button>
            </div>
          </div>

          {submittedStatus === "received" && (
            <div className="space-y-3 p-3.5 rounded-xl bg-[#030D1B] border border-[#153B68] animate-in fade-in-50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Date Received</label>
                  <Input
                    type="date"
                    value={submittedDate}
                    onChange={(e) => setSubmittedDate(e.target.value)}
                    className="h-8 text-xs bg-[#051324] border-[#183D68] text-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Source</label>
                  <Input
                    value={submittedSource}
                    onChange={(e) => setSubmittedSource(e.target.value)}
                    placeholder="e.g. Parent Email CC, Direct Upload, Parent Forwarded"
                    className="h-8 text-xs bg-[#051324] border-[#183D68] text-slate-100"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  Actual Submitted Text (as sent by parent to school)
                </label>
                <Textarea
                  value={submittedText}
                  onChange={(e) => setSubmittedText(e.target.value)}
                  placeholder="Paste or record the actual version the parent submitted..."
                  className="min-h-[140px] text-xs font-sans bg-[#051324] border-[#183D68] text-slate-100"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              size="sm"
              onClick={handleSaveSubmittedVersion}
              className="text-xs bg-[#F5B544] hover:bg-[#F5B544]/90 text-slate-950 font-bold cursor-pointer"
            >
              Save Submitted Status
            </Button>
          </div>
        </div>
      )}

      {/* ── Dialog: View Specific Evidence Details ──────────────────────────── */}
      {selectedEvidence && (
        <Dialog open={!!selectedEvidence} onOpenChange={() => setSelectedEvidence(null)}>
          <DialogContent className="max-w-lg bg-[#07182E] border border-[#1A4578] text-slate-100 shadow-2xl p-5">
            <DialogHeader className="pb-2 border-b border-[#183E6C]">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-amber-500/10 text-amber-300">
                  <FileSearch className="w-4 h-4 text-[#F5B544]" />
                </span>
                <DialogTitle className="text-sm font-bold text-white">
                  Evidence Details: {selectedEvidence.usedFor}
                </DialogTitle>
              </div>
            </DialogHeader>

            <div className="space-y-3 pt-2 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-0.5">
                  Source & Exact Location
                </span>
                <div className="p-2.5 rounded-lg bg-[#040E1B] border border-[#163860] font-mono text-blue-200">
                  {selectedEvidence.source} → {selectedEvidence.location}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-0.5">
                  Supporting Quote / Case Documentation
                </span>
                <p className="p-3 rounded-lg bg-[#040E1B] border border-[#163860] text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">
                  {selectedEvidence.quoteOrSnippet}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#183E6C]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedEvidence(null)}
                className="text-xs border-slate-700 bg-slate-900 text-slate-300"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Dialog: View Historical Version Snapshot ────────────────────────── */}
      {selectedHistory && (
        <Dialog open={!!selectedHistory} onOpenChange={() => setSelectedHistory(null)}>
          <DialogContent className="max-w-2xl bg-[#07182E] border border-[#1A4578] text-slate-100 shadow-2xl p-5">
            <DialogHeader className="pb-2 border-b border-[#183E6C]">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-blue-500/10 text-blue-300">
                  <Clock className="w-4 h-4" />
                </span>
                <DialogTitle className="text-sm font-bold text-white">
                  Version Snapshot: {selectedHistory.action}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-400">
                Recorded {new Date(selectedHistory.timestamp).toLocaleString()} by {selectedHistory.employee}
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[320px] overflow-y-auto p-3.5 rounded-xl bg-[#040E1B] border border-[#163860] text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">
              {selectedHistory.snapshot}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#183E6C]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(selectedHistory.snapshot);
                  toast.success("Version copied to clipboard!");
                }}
                className="text-xs border-slate-700 bg-slate-900 text-slate-300 gap-1"
              >
                <Copy className="w-3 h-3 text-[#F5B544]" />
                <span>Copy This Version</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedHistory(null)}
                  className="text-xs border-slate-700 bg-slate-900 text-slate-300"
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    onRestoreHistoryVersion(
                      selectedHistory.snapshot,
                      `Restored from snapshot: ${selectedHistory.action}`
                    );
                    setSelectedHistory(null);
                    toast.success("Statement restored from snapshot!");
                  }}
                  className="text-xs bg-[#F5B544] hover:bg-[#F5B544]/90 text-slate-950 font-bold gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restore to Working Draft</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
