import React, { useState } from "react";
import { MeetingTarget } from "../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Printer,
  ArrowUp,
  Target,
  MessageSquare,
  MapPin,
  FileCode2,
  Lightbulb,
  FileBarChart2,
  ShieldAlert,
  Database,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { TargetTagsControl, isTargetStruckThrough } from "../tags/TargetTagsControl";
import { cn } from "@/lib/utils";

interface AdvocateReadyViewProps {
  targets: MeetingTarget[];
  onUpdateTarget: (targetId: string, updates: Partial<MeetingTarget>) => void;
  studentName?: string;
  meetingTitle?: string;
  meetingDate?: string;
}

export function AdvocateReadyView({
  targets,
  onUpdateTarget,
  studentName = "Student",
  meetingTitle = "Annual IEP Meeting",
  meetingDate = "Upcoming",
}: AdvocateReadyViewProps) {
  const approvedTargets = targets;

  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState("");

  const handleStartEditingTitle = (target: MeetingTarget) => {
    setEditingTitleId(target.id);
    setEditingTitleValue(target.targetName || "");
  };

  const handleSaveTitle = (targetId: string) => {
    if (editingTitleValue.trim()) {
      onUpdateTarget(targetId, { targetName: editingTitleValue.trim() });
    }
    setEditingTitleId(null);
  };

  const scrollToTarget = (id: string) => {
    const el = document.getElementById(`target-card-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const scrollToTop = () => {
    const topEl = document.getElementById("advocate-ready-top");
    if (topEl) {
      topEl.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="advocate-ready-top" className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Top Header & Quick Navigator */}
      <div className="bg-[#0B1E36] border border-[#103E70] rounded-2xl p-6 shadow-2xl print:hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#0E3E75]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="border-[#F5B544]/40 text-[#F5B544] bg-[#0A254D] text-xs">
                Advocate Strategy Brief
              </Badge>
              <span className="text-xs text-blue-200/70">One Source of Truth · Full Advocate View</span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>{studentName}</span>
              <span className="text-blue-400/50 font-normal">|</span>
              <span className="text-blue-100 font-medium">{meetingTitle}</span>
            </h2>
            <p className="text-xs text-blue-300/70 mt-0.5">{meetingDate} · {approvedTargets.length} Prepared Advocacy Targets</p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
              className="border-[#0D4B84] bg-gradient-to-br from-[#0B3767] via-[#0A254D] to-[#071C3C] text-blue-100 hover:text-white hover:border-[#F5B544]/60 text-xs gap-1.5 shadow-md cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#F5B544]" />
              Print / Save PDF
            </Button>
          </div>
        </div>

        {/* Quick List Anchor Grid */}
        <div className="mt-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-300/80 mb-3 flex items-center justify-between">
            <span>Meeting Quick List & Jump Navigation</span>
            <span className="text-[11px] text-blue-300/60 font-normal">Click any target to scroll directly</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {approvedTargets.map((target, idx) => (
              <button
                key={target.id}
                onClick={() => scrollToTarget(target.id)}
                className="text-left px-3.5 py-2.5 rounded-xl bg-[#092244]/80 hover:bg-[#0E3E75] border border-[#144A7E] hover:border-[#F5B544]/50 transition-all flex items-start gap-2.5 group cursor-pointer"
              >
                <span className="text-[11px] font-mono font-bold text-[#F5B544] bg-[#071C3C] border border-[#F5B544]/30 px-1.5 py-0.5 rounded shrink-0">
                  #{idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-blue-100 group-hover:text-[#F5B544] truncate">
                    {target.targetName}
                  </div>
                  <div className="text-[10px] text-blue-300/70 truncate flex items-center gap-1.5 mt-0.5">
                    <span>{target.iepSection}</span>
                    <span>•</span>
                    <span className="capitalize">{target.meetingStatus?.replace("_", " ").toLowerCase() || "not discussed"}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Target Breakdown Cards (One Target per Page Block) */}
      <div className="space-y-8 print:space-y-12">
        {approvedTargets.map((target, index) => {
          const isStruck = isTargetStruckThrough(target);
          const hasRepair = target.tags?.includes("ADVOCATE_REPAIR");
          const isImportant = target.tags?.includes("IMPORTANT");

          return (
            <div
              id={`target-card-${target.id}`}
              key={target.id}
              className={cn(
                "bg-[#0B1E36] border rounded-2xl p-6 sm:p-8 shadow-2xl relative target-print-page print:border-none print:shadow-none print:p-0 transition-all",
                hasRepair
                  ? "border-rose-500/60 shadow-rose-950/20"
                  : isImportant
                  ? "border-amber-500/60 shadow-amber-950/20"
                  : "border-[#103E70]"
              )}
              style={{ breakAfter: "page", pageBreakAfter: "always" }}
            >
              {/* Back to Quick List - Top (hidden on print) */}
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#0E3E75] print:hidden">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-[#F5B544]/40 text-[#F5B544] bg-[#0A254D] text-xs">
                    Target #{index + 1} of {approvedTargets.length}
                  </Badge>
                  <span className="text-xs text-blue-200/80">Section: <strong className="text-white">{target.iepSection}</strong></span>
                </div>
                <Button
                  onClick={scrollToTop}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-blue-300 hover:text-white hover:bg-white/[0.06] gap-1 h-7 cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  Back to Quick List
                </Button>
              </div>

              {/* Target Header */}
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold tracking-wider uppercase text-[#F5B544] mb-1 flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-[#F5B544]" />
                    <span>TARGET {index + 1}</span>
                    {target.externalTargetId && (
                      <span className="font-mono text-[10.5px] px-1.5 py-0.2 rounded bg-[#071C3C] border border-[#144A7E] text-blue-200">
                        {target.externalTargetId}
                      </span>
                    )}
                  </div>

                  {editingTitleId === target.id ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        value={editingTitleValue}
                        onChange={(e) => setEditingTitleValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveTitle(target.id);
                          if (e.key === "Escape") setEditingTitleId(null);
                        }}
                        className="h-9 text-lg font-bold bg-[#030D1A] border-[#F5B544] text-white px-3 rounded-lg"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveTitle(target.id)}
                        className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                        title="Save title"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTitleId(null)}
                        className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 cursor-pointer"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap group/cardtitle">
                      <h3
                        onClick={() => handleStartEditingTitle(target)}
                        className={cn(
                          "text-2xl font-bold transition-colors cursor-pointer hover:text-[#F5B544]",
                          isStruck
                            ? "line-through opacity-60 text-slate-400"
                            : "text-white"
                        )}
                        title="Click to edit topic title"
                      >
                        {target.targetName}
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleStartEditingTitle(target)}
                        className="text-blue-400/50 hover:text-[#F5B544] p-1.5 rounded-lg hover:bg-[#0E3E75] transition-colors cursor-pointer inline-flex items-center"
                        title="Edit topic title"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {/* ── TARGET TAGS CONTROL (Tag icon next to pencil + active colored pill boxes) ── */}
                      <TargetTagsControl
                        target={target}
                        onUpdateTarget={onUpdateTarget}
                      />
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <Badge className="bg-[#071C3C] text-blue-200 border border-[#144A7E] text-xs uppercase">
                    {target.meetingStatus?.replace("_", " ") || "Pending Discussion"}
                  </Badge>
                </div>
              </div>

              {/* 6 Structured Advocacy Sections */}
              <div className="space-y-5">
                {/* 1. Advocate Say This */}
                <div className="bg-[#092244]/90 border border-[#F5B544]/30 rounded-2xl p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#F5B544] uppercase tracking-wide mb-2">
                    <MessageSquare className="w-4 h-4 text-[#F5B544]" />
                    <span>1. 🗣 Advocate Say This (Verbal Script)</span>
                  </div>
                  <div className="space-y-3">
                    <div
                      className={cn(
                        "p-3.5 bg-[#071C3C]/90 border border-[#F5B544]/40 rounded-xl font-medium text-sm leading-relaxed",
                        isStruck
                          ? "line-through opacity-60 text-slate-400"
                          : "text-amber-100"
                      )}
                    >
                      "{target.quickAdvocateSayThis}"
                    </div>
                    {target.fullAdvocateScript && target.fullAdvocateScript !== target.quickAdvocateSayThis && (
                      <div
                        className={cn(
                          "text-xs leading-relaxed pl-1 pt-1 border-t border-[#0E3E75]",
                          isStruck
                            ? "line-through opacity-60 text-slate-400"
                            : "text-blue-200"
                        )}
                      >
                        <span className="text-blue-300/70 font-semibold block mb-1">Extended Script:</span>
                        {target.fullAdvocateScript}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 2. Put It Here */}
                  <div className="bg-[#092244]/70 border border-[#103E70] rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-sky-300 uppercase tracking-wide mb-2">
                      <MapPin className="w-4 h-4 text-sky-400" />
                      <span>2. ✍ Put It Here (IEP Location)</span>
                    </div>
                    <p className="text-xs text-blue-100 leading-relaxed font-mono bg-[#071C3C] p-2.5 rounded-xl border border-[#144A7E]">
                      {target.putItHereLocation || target.iepSection}
                    </p>
                  </div>

                  {/* 3. Possible IEP Wording */}
                  <div className="bg-[#092244]/70 border border-[#103E70] rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wide mb-2">
                      <FileCode2 className="w-4 h-4 text-indigo-400" />
                      <span>3. 💬 Proposed IEP Wording</span>
                    </div>
                    <p className="text-xs text-blue-100 leading-relaxed italic bg-[#071C3C] p-2.5 rounded-xl border border-[#144A7E]">
                      "{target.possibleIepWording || target.quickAdvocateSayThis}"
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 4. Why */}
                  <div className="bg-[#092244]/70 border border-[#103E70] rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 uppercase tracking-wide mb-2">
                      <Lightbulb className="w-4 h-4 text-emerald-400" />
                      <span>4. 💡 Why We Want It</span>
                    </div>
                    <p className="text-xs text-blue-200 leading-relaxed">
                      {target.whyWeWantIt || "To ensure appropriate access to general curriculum and address specific deficit area."}
                    </p>
                  </div>

                  {/* 5. Supporting Evidence */}
                  <div className="bg-[#092244]/70 border border-[#103E70] rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-teal-300 uppercase tracking-wide mb-2">
                      <FileBarChart2 className="w-4 h-4 text-teal-400" />
                      <span>5. 📊 Supporting Evidence</span>
                    </div>
                    <p className="text-xs text-blue-200 leading-relaxed">
                      {target.supportingEvidence || "Documented baseline progress notes and parent observations."}
                    </p>
                  </div>
                </div>

                {/* 6. If Team Disagrees */}
                <div className="bg-[#092244]/90 border border-rose-500/30 rounded-2xl p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-300 uppercase tracking-wide mb-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>6. 🛡 If Team Disagrees (Negotiation Strategy & Pushback)</span>
                  </div>
                  <div className="text-xs text-rose-100 leading-relaxed p-3 bg-[#071C3C] border border-rose-500/30 rounded-xl">
                    {target.ifTeamDisagrees || "Ask: 'What objective evaluation data is the team relying on to conclude this support is unnecessary?' If denied, request Prior Written Notice (PWN) documenting refusal rationale."}
                  </div>
                </div>

                {/* Source Traceability */}
                {target.sources && target.sources.length > 0 && (
                  <div className="flex items-center gap-2 pt-2 text-[11px] text-blue-300/70">
                    <Database className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="font-semibold text-blue-200">Evidence Sources:</span>
                    <span className="text-blue-100">{target.sources.join(" · ")}</span>
                  </div>
                )}

                {/* Live Meeting Tracking Strip */}
                <div className="mt-6 pt-5 border-t border-[#0E3E75] bg-[#071C3C]/90 p-4 rounded-2xl border border-[#103E70]">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-300/80 mb-3">
                    Meeting Decision & Outcome Checklist
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 text-xs">
                    <label className="flex items-center gap-2 p-2 rounded-xl bg-[#092244] border border-[#144A7E] hover:border-[#F5B544]/50 cursor-pointer">
                      <Checkbox
                        checked={target.meetingStatus === "DISCUSSED" || target.meetingStatus === "AGREED"}
                        onCheckedChange={(checked) => {
                          if (checked && target.meetingStatus === "NOT_DISCUSSED") {
                            onUpdateTarget(target.id, { meetingStatus: "DISCUSSED", requestRaised: true });
                          }
                        }}
                      />
                      <span className="text-blue-200">Discussed</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl bg-[#092244] border border-[#144A7E] hover:border-[#F5B544]/50 cursor-pointer">
                      <Checkbox
                        checked={target.meetingStatus === "AGREED"}
                        onCheckedChange={(checked) => {
                          onUpdateTarget(target.id, { meetingStatus: checked ? "AGREED" : "DISCUSSED", requestRaised: true });
                        }}
                      />
                      <span className="text-emerald-300">Agreed</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl bg-[#092244] border border-[#144A7E] hover:border-[#F5B544]/50 cursor-pointer">
                      <Checkbox
                        checked={target.addedToIep}
                        onCheckedChange={(checked) => {
                          onUpdateTarget(target.id, { addedToIep: !!checked });
                        }}
                      />
                      <span className="text-sky-300">Added to IEP</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl bg-[#092244] border border-[#144A7E] hover:border-[#F5B544]/50 cursor-pointer">
                      <Checkbox
                        checked={target.meetingStatus === "DENIED"}
                        onCheckedChange={(checked) => {
                          onUpdateTarget(target.id, {
                            meetingStatus: checked ? "DENIED" : "NOT_DISCUSSED",
                            pwnNeeded: checked ? true : target.pwnNeeded,
                            requestRaised: true,
                          });
                        }}
                      />
                      <span className="text-rose-300">Denied</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl bg-[#092244] border border-[#144A7E] hover:border-[#F5B544]/50 cursor-pointer">
                      <Checkbox
                        checked={target.meetingStatus === "DEFERRED"}
                        onCheckedChange={(checked) => {
                          onUpdateTarget(target.id, {
                            meetingStatus: checked ? "DEFERRED" : "NOT_DISCUSSED",
                            requestRaised: true,
                          });
                        }}
                      />
                      <span className="text-purple-300">Deferred</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl bg-[#092244] border border-[#144A7E] hover:border-[#F5B544]/50 cursor-pointer">
                      <Checkbox
                        checked={target.pwnNeeded}
                        onCheckedChange={(checked) => {
                          onUpdateTarget(target.id, { pwnNeeded: !!checked });
                        }}
                      />
                      <span className="text-[#F5B544]">PWN Needed</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl bg-[#092244] border border-[#144A7E] hover:border-[#F5B544]/50 cursor-pointer">
                      <Checkbox
                        checked={target.followUpNeeded}
                        onCheckedChange={(checked) => {
                          onUpdateTarget(target.id, { followUpNeeded: !!checked });
                        }}
                      />
                      <span className="text-teal-300">Follow-up</span>
                    </label>
                  </div>
                </div>

                {/* 📝 My Notes on this Target */}
                <div className="mt-4 p-4 rounded-2xl bg-[#071C3C]/90 border border-[#103E70] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#F5B544] flex items-center gap-1.5">
                      <span>📝</span>
                      <span>My Notes / Team Commitments</span>
                    </div>
                    <span className="text-[10px] text-blue-300/60 font-medium print:hidden">Auto-saved to workspace</span>
                  </div>
                  <Textarea
                    value={target.notes || ""}
                    onChange={(e) => onUpdateTarget(target.id, { notes: e.target.value })}
                    placeholder="Enter notes, team commitments, who spoke, or specific follow-up actions..."
                    className="text-xs bg-[#051426] border-[#144A7E] text-white placeholder:text-blue-300/40 min-h-[85px] leading-relaxed rounded-xl p-3 focus:border-[#F5B544]/60 resize-y"
                  />
                </div>
              </div>

              {/* Back to Quick List - Bottom (hidden on print) */}
              <div className="flex items-center justify-end pt-6 mt-6 border-t border-[#0E3E75] print:hidden">
                <Button
                  onClick={scrollToTop}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-blue-300 hover:text-white hover:bg-white/[0.06] gap-1 h-7 cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  Back to Quick List
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
