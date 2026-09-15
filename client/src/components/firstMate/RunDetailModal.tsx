import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Badge,
} from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  MessageSquare,
  Play,
  Sparkles,
  Star,
} from "lucide-react";
import { SPEAKER_CONFIG, SUGGESTED_EVAL_TAGS } from "./firstMateRunTypes";

export interface RunDetailModalProps {
  run: any | null;
  onClose: () => void;
  onLoadSession: (session: any) => void;
  onCopySummary: (run: any, e: React.MouseEvent) => void;
  onFeedbackSaved: () => void;
  initialTab?: "guidance" | "transcript" | "detections" | "qa" | "summary" | "feedback";
}

export function RunDetailModal({
  run,
  onClose,
  onLoadSession,
  onCopySummary,
  onFeedbackSaved,
  initialTab = "guidance",
}: RunDetailModalProps) {
  const [inspectTab, setInspectTab] = useState<
    "guidance" | "transcript" | "detections" | "qa" | "summary" | "feedback"
  >(initialTab);

  // Feedback form state
  const [feedbackRating, setFeedbackRating] = useState<number>(run?.advocateRating || 5);
  const [feedbackNotes, setFeedbackNotes] = useState<string>(run?.advocateFeedback || "");
  const [feedbackTags, setFeedbackTags] = useState<string[]>([]);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  useEffect(() => {
    if (run) {
      setFeedbackRating(run.advocateRating || 5);
      setFeedbackNotes(run.advocateFeedback || "");
      try {
        const parsedTags = Array.isArray(run.tags)
          ? run.tags
          : typeof run.tags === "string"
          ? JSON.parse(run.tags)
          : [];
        setFeedbackTags(parsedTags);
      } catch {
        setFeedbackTags([]);
      }
      setInspectTab(initialTab);
    }
  }, [run, initialTab]);

  const updateFeedbackMutation = trpc.firstMate.updateSessionFeedback.useMutation();

  if (!run) return null;

  const handleToggleTag = (tag: string) => {
    if (feedbackTags.includes(tag)) {
      setFeedbackTags(feedbackTags.filter((t) => t !== tag));
    } else {
      setFeedbackTags([...feedbackTags, tag]);
    }
  };

  const handleSaveFeedback = async () => {
    if (!run) return;
    setIsSubmittingFeedback(true);
    try {
      await updateFeedbackMutation.mutateAsync({
        sessionId: run.sessionId,
        advocateRating: feedbackRating,
        advocateFeedback: feedbackNotes,
        tags: JSON.stringify(feedbackTags),
      });
      toast.success("AI tuning feedback saved! Byron's prompt repository updated.");
      onFeedbackSaved();
    } catch (err: any) {
      toast.error(`Failed to save feedback: ${err.message || "Unknown error"}`);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <Dialog open={!!run} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl bg-[#08182b] border border-white/15 text-white max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Modal Header */}
        <DialogHeader className="p-4 border-b border-white/10 bg-[#06111f]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    run.mode === "LIVE"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]"
                      : "bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]"
                  }
                >
                  {run.mode === "LIVE" ? "LIVE AUDIO" : "SIMULATOR TEST"}
                </Badge>
                <DialogTitle className="text-base font-bold text-white">
                  {run.title || "First Mate Run Record"}
                </DialogTitle>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {run.studentName || "Student"} •{" "}
                {new Date(run.createdAt).toLocaleString()} •{" "}
                {run.turnCount || run.transcript?.length || 0} turns
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => onLoadSession(run)}
                className="h-7 px-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Play className="w-3 h-3 fill-white" />
                Load in Copilot
              </Button>
              <Button
                onClick={(e) => onCopySummary(run, e)}
                variant="outline"
                className="h-7 px-2.5 bg-white/5 hover:bg-white/10 text-slate-200 border-white/10 text-xs cursor-pointer"
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy MD
              </Button>
            </div>
          </div>

          {/* Sub-tabs in modal */}
          <div className="flex items-center gap-1 mt-3 overflow-x-auto scrollbar-none border-t border-white/5 pt-2 text-xs">
            {[
              { id: "guidance", label: "💡 AI Guidance" },
              { id: "transcript", label: `🎙️ Full Transcript (${run.transcript?.length || 0})` },
              { id: "detections", label: "🎯 Tracked Matters" },
              { id: "qa", label: `💬 In-Session Q&A (${run.askHistory?.length || 0})` },
              { id: "summary", label: "📋 Executive Summary" },
              { id: "feedback", label: "⭐ AI Learning & Critique" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setInspectTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-md font-semibold text-xs transition-all cursor-pointer whitespace-nowrap ${
                  inspectTab === tab.id
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs"
                    : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </DialogHeader>

        {/* Modal Body Area */}
        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
          {/* TAB 1: AI GUIDANCE */}
          {inspectTab === "guidance" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-[#06111f] border border-white/10 rounded-xl p-3.5 space-y-2">
                  <span className="text-[10.5px] font-bold text-amber-400 uppercase tracking-wider block">
                    Detected Primary Issue
                  </span>
                  <p className="text-sm font-bold text-white">
                    {run.keyIssue || run.liveAssist?.currentIssue || "General Advocacy Inquiry"}
                  </p>
                  {run.liveAssist?.currentIssueDescription && (
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {run.liveAssist.currentIssueDescription}
                    </p>
                  )}
                </div>

                <div className="bg-[#06111f] border border-white/10 rounded-xl p-3.5 space-y-2">
                  <span className="text-[10.5px] font-bold text-cyan-400 uppercase tracking-wider block">
                    Direct Fast Answer
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {run.quickAnswer ||
                      run.liveAssist?.quickAnswer ||
                      "Listen attentively to the school's rationale and request supporting data."}
                  </p>
                </div>
              </div>

              {/* Applicable Legal Principle & Distinctions */}
              {run.liveAssist?.applicablePrinciple && (
                <div className="bg-[#06111f] border border-sky-500/30 rounded-xl p-3.5 space-y-1.5">
                  <span className="text-[10.5px] font-bold text-sky-400 uppercase tracking-wider block">
                    Applicable Legal Principle / Standard
                  </span>
                  <p className="text-xs text-sky-100 leading-relaxed font-medium">
                    {run.liveAssist.applicablePrinciple}
                  </p>
                  {run.liveAssist.distinctions && run.liveAssist.distinctions.length > 0 && (
                    <div className="pt-2 border-t border-white/5 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Key Distinctions & Conditions:
                      </span>
                      <ul className="space-y-0.5">
                        {run.liveAssist.distinctions.map((d: string, di: number) => (
                          <li key={di} className="text-xs text-slate-300 flex items-start gap-1.5">
                            <span className="text-cyan-400 font-bold">•</span>
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {run.liveAssist.missingFacts && run.liveAssist.missingFacts.length > 0 && (
                    <div className="pt-1 text-[11px] text-amber-300">
                      <strong>Missing Facts to Verify:</strong> {run.liveAssist.missingFacts.join(" • ")}
                    </div>
                  )}
                </div>
              )}

              {/* Say This Guidance (Secondary) */}
              <div className="bg-[#06111f] border border-emerald-500/30 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Suggested Client Wording (Secondary)
                  </span>
                  <button
                    onClick={() => {
                      const text = run.sayThis || run.liveAssist?.sayThis || "";
                      if (text) {
                        navigator.clipboard.writeText(text);
                        toast.success("Copied client phrasing to clipboard");
                      }
                    }}
                    className="text-[11px] text-emerald-400 hover:text-emerald-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <p className="text-sm font-medium text-white italic leading-relaxed bg-[#0b213a]/50 p-3 rounded-lg border border-emerald-500/20">
                  "{run.sayThis || run.liveAssist?.sayThis || "N/A"}"
                </p>
              </div>

              {/* Ask Next Questions */}
              {run.liveAssist?.askNext && run.liveAssist.askNext.length > 0 && (
                <div className="bg-[#06111f] border border-white/10 rounded-xl p-3.5 space-y-2">
                  <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider block">
                    Recommended Follow-Up Questions
                  </span>
                  <ul className="space-y-1.5">
                    {run.liveAssist.askNext.map((q: string, idx: number) => (
                      <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                        <span className="text-purple-400 font-bold">•</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Why It Matters */}
              {(run.whyItMatters || run.liveAssist?.whyItMatters) && (
                <div className="bg-[#06111f] border border-white/10 rounded-xl p-3.5 space-y-2">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                    Legal Basis & Why It Matters
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {run.whyItMatters || run.liveAssist?.whyItMatters}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FULL TRANSCRIPT */}
          {inspectTab === "transcript" && (
            <div className="space-y-2.5">
              {(run.transcript || []).length === 0 ? (
                <p className="text-center py-10 text-xs text-slate-500 italic">
                  No speech turns recorded in this session.
                </p>
              ) : (
                (run.transcript || []).map((t: any) => {
                  const cfg = SPEAKER_CONFIG[t.speakerRole] || SPEAKER_CONFIG.Other;
                  return (
                    <div
                      key={t.id}
                      className="flex items-start gap-3 bg-[#06111f] p-3 rounded-lg border border-white/5"
                    >
                      <div
                        className={`w-7 h-7 rounded-full ${cfg.bg} ${cfg.text} border ${cfg.border} flex items-center justify-center text-xs font-bold shrink-0 mt-0.5`}
                      >
                        {cfg.initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className={`font-bold ${cfg.text}`}>{cfg.label}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(t.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed select-text">
                          {t.text}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: DETECTIONS */}
          {inspectTab === "detections" && (
            <div className="space-y-4">
              {/* Requests */}
              <div className="bg-[#06111f] border border-white/10 rounded-xl p-3.5 space-y-2">
                <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                  Requests Made ({(run.requests || []).length})
                </span>
                {(run.requests || []).length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No formal requests logged.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {(run.requests || []).map((r: any, idx: number) => (
                      <li
                        key={idx}
                        className="text-xs text-slate-200 bg-black/30 p-2 rounded border border-white/5"
                      >
                        <strong className="text-sky-300">[{r.speaker || "Parent"}]:</strong>{" "}
                        {r.summary}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Refusals */}
              <div className="bg-[#06111f] border border-white/10 rounded-xl p-3.5 space-y-2">
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                  Refusals Documented ({(run.refusals || []).length})
                </span>
                {(run.refusals || []).length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No refusals documented.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {(run.refusals || []).map((rf: any, idx: number) => (
                      <li
                        key={idx}
                        className="text-xs text-slate-200 bg-black/30 p-2 rounded border border-white/5"
                      >
                        <strong className="text-rose-300">[{rf.speaker || "School"}]:</strong>{" "}
                        {rf.summary}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Commitments */}
              <div className="bg-[#06111f] border border-white/10 rounded-xl p-3.5 space-y-2">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  Commitments Agreed ({(run.commitments || []).length})
                </span>
                {(run.commitments || []).length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No commitments recorded.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {(run.commitments || []).map((c: any, idx: number) => (
                      <li
                        key={idx}
                        className="text-xs text-slate-200 bg-black/30 p-2 rounded border border-white/5"
                      >
                        <strong className="text-emerald-300">[{c.speaker || "School"}]:</strong>{" "}
                        {c.summary}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: IN-SESSION Q&A */}
          {inspectTab === "qa" && (
            <div className="space-y-3">
              {(run.askHistory || []).length === 0 ? (
                <p className="text-center py-10 text-xs text-slate-500 italic">
                  No questions were asked to First Mate during this run.
                </p>
              ) : (
                (run.askHistory || []).map((q: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-[#06111f] border border-white/10 rounded-xl p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" /> Q{idx + 1}: {q.question}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(q.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="bg-black/40 p-3 rounded-lg border border-white/5 text-xs text-slate-200 leading-relaxed space-y-2">
                      {q.applicablePrinciple && (
                        <div className="p-2 rounded bg-sky-950/40 border border-sky-500/30 text-sky-200 text-xs">
                          <strong className="text-sky-300 block mb-0.5 text-[10px] uppercase tracking-wide">
                            Applicable Legal Principle:
                          </strong>
                          {q.applicablePrinciple}
                        </div>
                      )}
                      <div>
                        <strong className="text-cyan-300 block mb-1">Substantive Internal Guidance:</strong>
                        <p className="whitespace-pre-line">{q.answer}</p>
                      </div>
                      {q.distinctions && q.distinctions.length > 0 && (
                        <div className="text-[11px] text-slate-300 bg-[#06111f] p-2 rounded border border-white/5 space-y-0.5">
                          <strong className="text-cyan-400 block mb-0.5 text-[10px] uppercase">
                            Distinctions & Conditions:
                          </strong>
                          {q.distinctions.map((d: string, di: number) => (
                            <p key={di}>• {d}</p>
                          ))}
                        </div>
                      )}
                      {q.missingFacts && q.missingFacts.length > 0 && (
                        <div className="text-[11px] text-amber-300 bg-amber-950/30 p-2 rounded border border-amber-500/30">
                          <strong className="block mb-0.5 text-[10px] uppercase">Missing Facts to Verify:</strong>
                          {q.missingFacts.join(" • ")}
                        </div>
                      )}
                      {q.suggestedClientWording && (
                        <div className="p-2 rounded bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 text-xs">
                          <strong className="text-emerald-300 block mb-0.5 text-[10px] uppercase">
                            Suggested Client Wording (Secondary):
                          </strong>
                          <p className="italic text-emerald-100">"{q.suggestedClientWording}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 5: SUMMARY */}
          {inspectTab === "summary" && (
            <div className="bg-[#06111f] border border-white/10 rounded-xl p-4 text-xs text-slate-200 space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Executive Debrief
              </h4>
              <p className="leading-relaxed whitespace-pre-line text-slate-300">
                {run.summary ||
                  "Session concluded cleanly. Transcript and all advocacy suggestions recorded."}
              </p>
            </div>
          )}

          {/* TAB 6: AI LEARNING & CRITIQUE */}
          {inspectTab === "feedback" && (
            <div className="bg-[#06111f] border border-yellow-500/30 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-yellow-300 flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-yellow-400" /> Advocate AI Tuning & Prompt
                    Evaluation
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Your ratings and feedback directly train our prompt guidelines and prevent
                    missed legal timelines.
                  </p>
                </div>
              </div>

              {/* Star rating selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Overall Accuracy & Legal Quality Rating
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      className="p-1 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= feedbackRating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-slate-600 hover:text-yellow-400/50"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-sm font-mono font-bold text-yellow-400 ml-2">
                    {feedbackRating} of 5 Stars
                  </span>
                </div>
              </div>

              {/* Evaluation Quick Tags */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Quick Quality Tags (Click to toggle)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_EVAL_TAGS.map((tag) => {
                    const isSelected = feedbackTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleToggleTag(tag)}
                        className={`px-2 py-1 rounded text-xs font-medium border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/50 font-bold"
                            : "bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-200"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Feedback Critique textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Advocate Critique & Tuning Notes
                </label>
                <Textarea
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  placeholder="What did First Mate do well? What should it have advised Byron to say instead? What regulation or timeline did it miss?"
                  className="bg-[#08182b] border-white/15 text-xs text-white placeholder:text-slate-500 min-h-[90px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  onClick={handleSaveFeedback}
                  disabled={isSubmittingFeedback}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-4"
                >
                  {isSubmittingFeedback ? "Saving Feedback..." : "Save Evaluation & Improve AI"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="p-3 border-t border-white/10 bg-[#06111f] flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-mono">
            Model: {run.aiModel || "@cf/meta/llama-3.1-8b-instruct"} • {run.aiLatencyMs || 350}ms
          </div>
          <Button
            onClick={onClose}
            variant="outline"
            className="bg-white/5 text-slate-300 border-white/10 text-xs cursor-pointer"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
