import React, { useState, useEffect } from "react";
import { Plus, Sparkles, CheckCircle2, X, Wrench, Send } from "lucide-react";

export interface ToolRequestSubmission {
  id: string;
  toolName: string;
  category: string;
  audience: string;
  urgency: string;
  description: string;
  createdAt: string;
}

interface RequestToolModalProps {
  open: boolean;
  onClose: () => void;
}

const STORAGE_KEY = "waypoint_tool_requests_v1";

export function RequestToolModal({ open, onClose }: RequestToolModalProps) {
  const [toolName, setToolName] = useState("");
  const [category, setCategory] = useState("Meeting Support");
  const [audience, setAudience] = useState("Both Parents & Advocates");
  const [urgency, setUrgency] = useState("Needed for upcoming IEP");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [savedRequests, setSavedRequests] = useState<ToolRequestSubmission[]>(
    []
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setSavedRequests(JSON.parse(raw));
      }
    } catch {
      // ignore storage errors
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolName.trim() || !description.trim()) {
      import("sonner").then(({ toast }) =>
        toast.error(
          "Please enter a tool name and describe what it should help with."
        )
      );
      return;
    }

    const newEntry: ToolRequestSubmission = {
      id: `req-${Date.now()}`,
      toolName: toolName.trim(),
      category,
      audience,
      urgency,
      description: description.trim(),
      createdAt: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    };

    const next = [newEntry, ...savedRequests];
    setSavedRequests(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }

    setSubmitted(true);
    import("sonner").then(({ toast }) =>
      toast.success(
        `Tool request "${newEntry.toolName}" submitted to the Waypoint product team!`
      )
    );
  };

  const handleResetAndClose = () => {
    setToolName("");
    setDescription("");
    setSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#091326] border border-[#5B4827] shadow-[0_28px_80px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.14)] p-6 sm:p-7 text-[#FBF6EC]">
        {/* Top Antique Brass Trim Line */}
        <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-[#D2AE68] to-transparent" />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#1E2B48] pb-4">
          <div className="flex items-start gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-b from-[#1A2747] to-[#0D1528] border border-[#C5A059]/60 flex items-center justify-center text-[#FFE394] shrink-0 shadow-md">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10.5px] uppercase tracking-[0.22em] text-[#C5A059] font-semibold">
                Waypoint Instrument Workshop
              </span>
              <h3
                className="text-2xl font-bold text-white mt-0.5"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Request a New Tool
              </h3>
              <p className="text-xs text-[#B8C2D8] mt-1">
                Tell us what advocacy instrument, calculator, or document
                builder you want in the cabinet next.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetAndClose}
            className="text-[#9AA4BC] hover:text-white p-1.5 rounded-lg bg-[#060C18] border border-[#24324F] cursor-pointer transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4 pt-5 text-left">
            {/* Tool Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#FFE394]">
                Instrument / Tool Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={toolName}
                onChange={(e) => setToolName(e.target.value)}
                placeholder="e.g., 504 Plan Builder, FBA Behavior Data Tracker, MDR Prep Guide..."
                className="w-full h-10 px-3.5 rounded-lg bg-[#060C1A] border border-[#283655] text-sm text-[#FBF6EC] placeholder:text-[#6E7A96] focus:outline-none focus:border-[#C5A059]"
              />
            </div>

            {/* Category & Audience Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#C6B697]">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-[#060C1A] border border-[#283655] text-sm text-[#FBF6EC] focus:outline-none focus:border-[#C5A059]"
                >
                  <option value="Meeting Support">Meeting Support</option>
                  <option value="Document Review & Analysis">
                    Document Review &amp; Analysis
                  </option>
                  <option value="Concern & Dispute Resolution">
                    Concern &amp; Dispute Resolution
                  </option>
                  <option value="Case Chronology & Timelines">
                    Case Chronology &amp; Timelines
                  </option>
                  <option value="Quick Micro-Tool / Generator">
                    Quick Micro-Tool / Generator
                  </option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#C6B697]">
                  Primary Audience
                </label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-[#060C1A] border border-[#283655] text-sm text-[#FBF6EC] focus:outline-none focus:border-[#C5A059]"
                >
                  <option value="Both Parents & Advocates">
                    Both Parents &amp; Advocates
                  </option>
                  <option value="Parents & Families">
                    Parents &amp; Families
                  </option>
                  <option value="Lead Special Education Advocates">
                    Lead Special Education Advocates
                  </option>
                </select>
              </div>
            </div>

            {/* Urgency Pills */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#C6B697]">
                Priority / Timing
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  "Nice to have",
                  "Needed for upcoming IEP",
                  "High practice priority",
                ].map((level) => {
                  const active = urgency === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setUrgency(level)}
                      className={`px-2.5 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        active
                          ? "bg-[#1A274A] border-[#C5A059] text-[#FFE394] shadow-sm"
                          : "bg-[#060C1A] border-[#24324F] text-[#9AA4BC] hover:text-white"
                      }`}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description / Problem to solve */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#FFE394]">
                What should this tool do?{" "}
                <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the workflow, inputs (e.g. uploading an evaluation or logging service minutes), and the output you'd like it to generate..."
                className="w-full p-3.5 rounded-lg bg-[#060C1A] border border-[#283655] text-sm text-[#FBF6EC] placeholder:text-[#6E7A96] focus:outline-none focus:border-[#C5A059] resize-none leading-relaxed"
              />
            </div>

            {/* Previous Requests Preview (if any) */}
            {savedRequests.length > 0 && (
              <div className="pt-2 border-t border-[#1E2B48] space-y-2">
                <span className="text-[10.5px] uppercase tracking-wider text-[#A69371] font-semibold block">
                  Your Recent Tool Requests ({savedRequests.length})
                </span>
                <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                  {savedRequests.slice(0, 3).map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#060C1A] border border-[#1E2B48] text-xs"
                    >
                      <div className="truncate pr-2">
                        <span className="font-semibold text-[#FFF4D4]">
                          {req.toolName}
                        </span>
                        <span className="text-[#8E98B0] ml-2">
                          · {req.category}
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                        Submitted {req.createdAt}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit & Cancel Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E2B48]">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2.5 rounded-lg text-xs font-medium text-[#C8D0E4] hover:text-white border border-[#283655] bg-[#060C1A] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold bg-gradient-to-b from-[#E5C887] via-[#C69F56] to-[#987230] text-[#0E1322] border border-[#FCE7B6]/75 shadow-[0_6px_18px_rgba(0,0,0,0.75)] hover:brightness-110 transition-all cursor-pointer"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                <Send className="h-3.5 w-3.5" />
                <span>Submit Tool Request</span>
              </button>
            </div>
          </form>
        ) : (
          /* Confirmation View */
          <div className="py-8 text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center mx-auto text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.25)]">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h4
                className="text-2xl font-bold text-white"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Request Logged in Workshop
              </h4>
              <p className="text-sm text-[#C8D0E4] leading-relaxed">
                We’ve added{" "}
                <span className="text-[#FFE394] font-semibold">
                  “{toolName}”
                </span>{" "}
                to our instrument roadmap under{" "}
                <span className="text-white">{category}</span>.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setToolName("");
                  setDescription("");
                  setSubmitted(false);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-[#FFE394] border border-[#C5A059]/50 bg-[#101C36] hover:bg-[#17284C] cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Request Another Tool</span>
              </button>
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-6 py-2 rounded-lg text-xs font-bold bg-gradient-to-b from-[#E5C887] via-[#C69F56] to-[#987230] text-[#0E1322] border border-[#FCE7B6]/75 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

