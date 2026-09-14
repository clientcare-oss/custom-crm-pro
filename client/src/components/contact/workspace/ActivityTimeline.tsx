/**
 * Activity Timeline — PG-030 Student Workspace
 * Complete Case History & AI-Powered Ask Case History
 * Pixel-accurate implementation matching approved design reference.
 */

import React, { useState, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sparkles,
  Search,
  ArrowRight,
  Plus,
  Lightbulb,
  SlidersHorizontal,
  Mail,
  Phone,
  FileText,
  Users,
  Check,
  MoreHorizontal,
  Calendar,
  Clock,
  CheckCircle2,
  Trash2,
  Edit3,
  ExternalLink,
  ChevronRight,
  Filter,
  CheckSquare,
} from "lucide-react";
import PageIdBadge from "@/components/PageIdBadge";

interface ActivityTimelineProps {
  contact: any;
  onSwitchTab?: (tabKey: string) => void;
}

export function ActivityTimeline({ contact, onSwitchTab }: ActivityTimelineProps) {
  const utils = trpc.useUtils();
  const timelineRef = useRef<HTMLDivElement>(null);

  // Student details with clean fallbacks matching approved design reference
  const studentName = contact
    ? `${contact.firstName || "Kylie"} ${contact.lastName || "Hitchcock"}`
    : "Kylie Hitchcock";
  const parentName = contact?.secondParentName || "Mrs. Urbanski";
  const gradeLevel = contact?.gradeLevel || "7th Grade";
  const schoolName = contact?.schoolName || "Bentonville Schools";
  const planType = contact?.planType || "Monthly Advocacy";
  const caseId = contact?.caseId || "WP-2026-0001";
  const studentContactId = contact?.id || 1;

  // ── Queries & Mutations ──
  const { data: timelineEvents = [], isLoading } = trpc.caseActivity.list.useQuery(
    { studentContactId, caseId },
    { enabled: !!studentContactId }
  );

  const createEventMutation = trpc.caseActivity.create.useMutation({
    onSuccess: () => {
      toast.success("Activity recorded to case history");
      utils.caseActivity.list.invalidate();
      setIsAddModalOpen(false);
      setIsLogDecisionOpen(false);
      resetForm();
    },
    onError: (err) => toast.error("Failed to add entry: " + err.message),
  });

  const toggleCompleteMutation = trpc.caseActivity.toggleComplete.useMutation({
    onSuccess: (_, variables) => {
      toast.success(variables.isCompleted ? "Action marked complete!" : "Action marked active");
      utils.caseActivity.list.invalidate();
    },
    onError: (err) => toast.error("Failed to update status: " + err.message),
  });

  const deleteEventMutation = trpc.caseActivity.delete.useMutation({
    onSuccess: () => {
      toast.success("Activity removed");
      utils.caseActivity.list.invalidate();
    },
    onError: (err) => toast.error("Failed to remove: " + err.message),
  });

  const askAiMutation = trpc.caseActivity.ask.useMutation({
    onSuccess: (data) => {
      setAiResponse(data.answer);
      setAiSources(data.sources || []);
    },
    onError: (err) => toast.error("AI Assistant error: " + err.message),
  });

  // ── AI State ──
  const [askQuery, setAskQuery] = useState("");
  const [aiResponse, setAiResponse] = useState(
    "Yes. On Sept 5, Byron recommended postponing the meeting so the DPR (re)evaluation request could begin before the next meeting. The next step was to request three alternate dates and times from the school."
  );
  const [aiSources, setAiSources] = useState<Array<{ type: string; label: string; date?: string; excerpt?: string }>>([
    { type: "call", label: "Call transcript", date: "Sept 5", excerpt: "Byron advised postponing the routine review until evaluation window officially opened." },
    { type: "note", label: "Advocate note", date: "Sept 5", excerpt: "Strategic hold advised to protect statutory timeline rights." },
    { type: "email", label: "Email", date: "Sept 4", excerpt: "Formal letter requesting academic evaluation submitted to Dr. Sabata." },
  ]);

  // ── Modals & Filter State ──
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLogDecisionOpen, setIsLogDecisionOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedSourceModal, setSelectedSourceModal] = useState<{ title: string; type: string; excerpt?: string } | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState<string>("");

  // ── Form State ──
  const [formTitle, setFormTitle] = useState("");
  const [formEventType, setFormEventType] = useState("strategy_decision");
  const [formDescription, setFormDescription] = useState("");
  const [formWhyReason, setFormWhyReason] = useState("");
  const [formOwnerName, setFormOwnerName] = useState("Byron Clausen");
  const [formOwnerRole, setFormOwnerRole] = useState("Advocate");
  const [formSourcesText, setFormSourcesText] = useState("Call transcript, Note");
  const [formQuoteText, setFormQuoteText] = useState("");
  const [formNextStep, setFormNextStep] = useState("");
  const [formIsActionNeeded, setFormIsActionNeeded] = useState(false);
  const [formCategoryColor, setFormCategoryColor] = useState("amber");

  const resetForm = () => {
    setFormTitle("");
    setFormEventType("strategy_decision");
    setFormDescription("");
    setFormWhyReason("");
    setFormOwnerName("Byron Clausen");
    setFormOwnerRole("Advocate");
    setFormSourcesText("Call transcript, Note");
    setFormQuoteText("");
    setFormNextStep("");
    setFormIsActionNeeded(false);
    setFormCategoryColor("amber");
  };

  const handleAskSubmit = (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    const query = (overrideText ?? askQuery).trim();
    if (!query) return;

    askAiMutation.mutate({
      studentContactId,
      caseId,
      query,
      studentName,
    });
  };

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDescription.trim()) {
      toast.error("Please provide both title and description.");
      return;
    }

    const sourcesArray = formSourcesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((label) => {
        let type: "email" | "call" | "note" | "document" | "task" = "note";
        const l = label.toLowerCase();
        if (l.includes("email") || l.includes("mail")) type = "email";
        else if (l.includes("call") || l.includes("transcript") || l.includes("phone")) type = "call";
        else if (l.includes("doc") || l.includes("pdf") || l.includes("letter")) type = "document";
        else if (l.includes("task") || l.includes("action")) type = "task";
        return { type, label };
      });

    createEventMutation.mutate({
      studentContactId,
      caseId,
      title: formTitle.trim(),
      eventType: formEventType,
      description: formDescription.trim(),
      whyReason: formWhyReason.trim() || undefined,
      ownerName: formOwnerName.trim() || "Staff",
      ownerRole: formOwnerRole.trim() || "Advocate",
      sources: sourcesArray,
      quoteText: formQuoteText.trim() || undefined,
      nextStepAction: formNextStep.trim() || undefined,
      isActionNeeded: formIsActionNeeded,
      categoryColor: formCategoryColor,
    });
  };

  // Filtered timeline events
  const filteredEvents = useMemo(() => {
    return timelineEvents.filter((event) => {
      if (filterCategory !== "all" && event.eventType !== filterCategory) return false;
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matches =
          event.title.toLowerCase().includes(q) ||
          event.description.toLowerCase().includes(q) ||
          (event.whyReason && event.whyReason.toLowerCase().includes(q)) ||
          event.ownerName.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [timelineEvents, filterCategory, searchFilter]);

  // Latest 5 events for the Recent Case Activity horizontal ribbon
  const latestFiveEvents = useMemo(() => {
    return [...timelineEvents].slice(0, 5);
  }, [timelineEvents]);

  // Neon helper utilities
  const getNeonStyles = (color: string) => {
    switch (color) {
      case "blue":
        return {
          glowDot: "bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.8)] border-sky-200",
          iconBox: "bg-sky-500/20 text-sky-400 border-sky-400/40 shadow-[0_0_15px_rgba(56,189,248,0.2)]",
          badge: "bg-sky-950/40 text-sky-300 border-sky-500/30",
          cardBorder: "border-sky-500/30 hover:border-sky-400/60",
        };
      case "teal":
        return {
          glowDot: "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)] border-emerald-200",
          iconBox: "bg-emerald-500/20 text-emerald-400 border-emerald-400/40 shadow-[0_0_15px_rgba(52,211,153,0.2)]",
          badge: "bg-emerald-950/40 text-emerald-300 border-emerald-500/30",
          cardBorder: "border-emerald-500/30 hover:border-emerald-400/60",
        };
      case "amber":
        return {
          glowDot: "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)] border-amber-200",
          iconBox: "bg-amber-500/20 text-amber-400 border-amber-400/40 shadow-[0_0_15px_rgba(251,191,36,0.2)]",
          badge: "bg-amber-950/40 text-amber-300 border-amber-500/30",
          cardBorder: "border-amber-500/30 hover:border-amber-400/60",
        };
      case "purple":
        return {
          glowDot: "bg-purple-400 shadow-[0_0_12px_rgba(192,132,252,0.8)] border-purple-200",
          iconBox: "bg-purple-500/20 text-purple-400 border-purple-400/40 shadow-[0_0_15px_rgba(192,132,252,0.2)]",
          badge: "bg-purple-950/40 text-purple-300 border-purple-500/30",
          cardBorder: "border-purple-500/30 hover:border-purple-400/60",
        };
      case "cyan":
        return {
          glowDot: "bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)] border-cyan-200",
          iconBox: "bg-cyan-500/20 text-cyan-400 border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.2)]",
          badge: "bg-cyan-950/40 text-cyan-300 border-cyan-500/30",
          cardBorder: "border-cyan-500/30 hover:border-cyan-400/60",
        };
      case "yellow":
      default:
        return {
          glowDot: "bg-[#F5B544] shadow-[0_0_12px_rgba(245,181,68,0.85)] border-amber-100",
          iconBox: "bg-amber-500/20 text-amber-400 border-amber-400/40 shadow-[0_0_15px_rgba(245,181,68,0.25)]",
          badge: "bg-amber-950/40 text-amber-300 border-amber-500/30",
          cardBorder: "border-amber-500/40 hover:border-amber-400/70",
        };
    }
  };

  const getEventIcon = (type: string, color: string) => {
    switch (type) {
      case "client_contact":
        return <Phone className="w-4 h-4" />;
      case "strategy_decision":
        return <Lightbulb className="w-4 h-4" />;
      case "consultation":
        return <Users className="w-4 h-4" />;
      case "next_step":
        return <Check className="w-4 h-4 stroke-[3]" />;
      case "evaluation_request":
      case "school_response":
      default:
        return <Mail className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-5 text-white font-sans">
      {/* ── 1. STUDENT HEADER WITH LIGHTHOUSE & MOTTO STAR ── */}
      <div className="rounded-2xl border border-blue-900/60 bg-[#061830] px-5 py-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Waypoint Lighthouse Brand & Student Specs */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Custom Golden Waypoint Lighthouse */}
            <svg viewBox="0 0 36 36" className="w-7 h-7 text-amber-400 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 3 L14 11 L22 11 Z" fill="#F5B544" />
              <rect x="15" y="11" width="6" height="5" fill="#FEF08A" />
              <polygon points="14,16 22,16 24,31 12,31" fill="#D97706" />
              <rect x="10" y="31" width="16" height="3" rx="1" fill="#92400E" />
            </svg>
            <div className="leading-tight">
              <div className="font-serif font-black tracking-widest text-[11px] text-white uppercase">WAYPOINT</div>
              <div className="font-mono text-[8px] tracking-wider text-amber-300 uppercase font-bold">ADVOCATES</div>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-blue-800/60 hidden sm:block" />

          {/* Student Profile Identity */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <span className="font-serif font-bold text-base text-white">{studentName}</span>
            <span className="text-blue-300/80">Parent: <strong className="text-white font-medium">{parentName}</strong></span>
            <span className="text-blue-500">•</span>
            <span className="text-blue-300/80">Grade: <strong className="text-white font-medium">{gradeLevel}</strong></span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold text-[11px]">
              <Check className="w-3 h-3 stroke-[3]" /> Active
            </span>
          </div>

          <div className="h-6 w-[1px] bg-blue-800/60 hidden md:block" />

          {/* Plan / School Details */}
          <div className="hidden lg:flex items-center gap-5 text-xs text-blue-200/80">
            <div>
              <span className="text-[10px] text-blue-400 block font-mono">Plan</span>
              <span className="font-medium text-white">{planType}</span>
            </div>
            <div>
              <span className="text-[10px] text-blue-400 block font-mono">School</span>
              <span className="font-medium text-white">{schoolName}</span>
            </div>
            <div>
              <span className="text-[10px] text-blue-400 block font-mono">Meeting Type</span>
              <span className="font-medium text-white">IEP Support</span>
            </div>
          </div>
        </div>

        {/* Right: Gold Nautical Star & Motto */}
        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-amber-400 shrink-0" fill="currentColor">
            <path d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z" />
          </svg>
          <div className="font-serif italic text-xs text-[#FFDF8A] tracking-wide text-right">
            Different Shores<br />Brighter Futures
          </div>
        </div>
      </div>

      {/* ── 2. FEATURE TITLE ROW & TOP ACTIONS ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif font-bold text-3xl sm:text-4xl text-white tracking-tight">
              Activity Timeline
            </h1>
            <PageIdBadge id="PG-030" name="Student Workspace · Activity Timeline" />
          </div>
          <div className="text-xs sm:text-sm text-slate-300 font-medium">
            Complete Case History
          </div>
        </div>

        {/* Philosophy Callout */}
        <div className="italic text-xs sm:text-sm text-blue-300/80 max-w-md border-l-2 border-blue-500/40 pl-3 py-0.5">
          Communication stores messages and transcripts. The Activity Timeline tells the story of the case.
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-[#F5B544] hover:bg-[#F5B544]/90 text-slate-950 font-bold text-xs sm:text-sm rounded-xl px-4 py-2 shadow-[0_0_15px_rgba(245,181,68,0.25)] flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Entry</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsLogDecisionOpen(true)}
            className="border-blue-700/80 bg-blue-950/60 hover:bg-blue-900/60 text-blue-200 text-xs sm:text-sm font-semibold rounded-xl px-3.5 py-2 flex items-center gap-1.5 cursor-pointer"
          >
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span>Log Decision</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsFilterOpen(true)}
            className="border-blue-700/80 bg-blue-950/60 hover:bg-blue-900/60 text-blue-200 text-xs sm:text-sm font-semibold rounded-xl px-3.5 py-2 flex items-center gap-1.5 cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 text-sky-400" />
            <span>Filters</span>
          </Button>
        </div>
      </div>

      {/* ── 3. TWO-COLUMN AI DECK: ASK CASE HISTORY + AI SUMMARY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column (7 cols): Ask Case History */}
        <div className="lg:col-span-7 rounded-2xl border border-blue-800/80 bg-gradient-to-br from-[#061830] via-[#071E3D] to-[#041021] p-5 shadow-2xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-400 fill-amber-400/20" />
              <div>
                <h3 className="font-bold text-white text-base sm:text-lg">Ask Case History</h3>
                <p className="text-xs text-blue-200/70">Get instant, accurate answers from your case history.</p>
              </div>
            </div>

            {/* Prominent Search Bar with Arrow Button */}
            <form onSubmit={handleAskSubmit} className="relative">
              <div className="rounded-xl bg-[#040E1D] border border-blue-800/90 flex items-center px-3.5 py-2 shadow-inner focus-within:border-amber-400/70 focus-within:ring-1 focus-within:ring-amber-400/30 transition-all">
                <Search className="w-4 h-4 text-blue-400 shrink-0 mr-2.5" />
                <input
                  type="text"
                  value={askQuery}
                  onChange={(e) => setAskQuery(e.target.value)}
                  placeholder="Did we tell the client to reschedule? Why?"
                  className="text-xs sm:text-sm text-white placeholder:text-blue-300/50 bg-transparent outline-none flex-1 font-medium"
                />
                <button
                  type="submit"
                  disabled={askAiMutation.isPending}
                  className="w-7 h-7 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-slate-950 flex items-center justify-center font-bold shadow-md cursor-pointer shrink-0 transition-transform active:scale-95 disabled:opacity-50"
                  title="Ask First Mate"
                >
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </form>
          </div>

          {/* Quick Query Suggestion Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-blue-300/70 font-medium">Try asking:</span>
            {[
              "What are the next steps?",
              "When is the next meeting?",
              "What has the school said?",
              "Summarize parent concerns",
            ].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setAskQuery(chip);
                  handleAskSubmit(undefined, chip);
                }}
                className="rounded-lg bg-blue-950/80 hover:bg-blue-900/80 border border-blue-800/70 text-blue-200 text-[11px] px-2.5 py-1 transition-all cursor-pointer hover:border-amber-400/50 hover:text-white"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Right Column (5 cols): AI Summary */}
        <div className="lg:col-span-5 rounded-2xl border border-blue-800/80 bg-gradient-to-br from-[#061830] via-[#071E3D] to-[#041021] p-5 shadow-2xl flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400 fill-sky-400/20" />
                <h3 className="font-bold text-white text-base">AI Summary</h3>
              </div>
              {aiSources.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const first = aiSources[0];
                    setSelectedSourceModal({
                      title: first.label,
                      type: first.type,
                      excerpt: first.excerpt || "Source verified in case communication records.",
                    });
                  }}
                  className="text-xs text-sky-400 hover:text-sky-300 cursor-pointer flex items-center gap-0.5 font-medium"
                >
                  <span>Sources ({aiSources.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Summary Answer */}
            <p className="text-xs sm:text-[13px] text-blue-100/95 leading-relaxed font-normal">
              {askAiMutation.isPending ? "Consulting case history records..." : aiResponse}
            </p>
          </div>

          {/* Clickable Source Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-blue-800/50">
            {aiSources.map((src, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() =>
                  setSelectedSourceModal({
                    title: src.label,
                    type: src.type,
                    excerpt: src.excerpt || "Primary source evidence logged in student workspace.",
                  })
                }
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-950/90 border border-blue-800/80 hover:border-sky-400/60 text-[11px] text-blue-200 hover:text-white transition-all cursor-pointer"
              >
                {src.type === "call" && <Phone className="w-3 h-3 text-emerald-400" />}
                {src.type === "email" && <Mail className="w-3 h-3 text-sky-400" />}
                {src.type === "note" && <FileText className="w-3 h-3 text-amber-400" />}
                {src.type === "task" && <CheckSquare className="w-3 h-3 text-yellow-400" />}
                <span>{src.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 4. RECENT CASE ACTIVITY HORIZONTAL RIBBON (5 LATEST EVENTS) ── */}
      <div className="rounded-2xl border border-blue-900/60 bg-[#061830] p-4 sm:p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            <h3 className="font-bold text-white text-sm">Recent Case Activity</h3>
            <span className="text-[11px] text-blue-300/70 ml-1">Latest 5 events</span>
          </div>
          <button
            type="button"
            onClick={() => {
              timelineRef.current?.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 5 Event Cards Strip with Controlled Neon Color Coding */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {latestFiveEvents.map((evt, idx) => {
            const neon = getNeonStyles(evt.categoryColor || "blue");
            const dateDisplay = new Date(evt.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            return (
              <div
                key={evt.id || idx}
                onClick={() => {
                  const el = document.getElementById(`timeline-node-${evt.id}`);
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                className={`p-3 rounded-xl border bg-blue-950/40 hover:bg-blue-900/30 transition-all cursor-pointer flex items-center gap-3 ${neon.cardBorder}`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${neon.iconBox}`}>
                  {getEventIcon(evt.eventType, evt.categoryColor || "blue")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-blue-300/70 font-mono font-medium">{dateDisplay}</div>
                  <div className="text-xs font-bold text-white truncate leading-tight mt-0.5">{evt.title}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 5. VERTICAL STORY OF THE CASE TIMELINE ── */}
      <div ref={timelineRef} className="rounded-2xl border border-blue-900/60 bg-[#061830] p-5 sm:p-7 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-blue-900/50 pb-4">
          <div>
            <h3 className="font-serif font-bold text-xl text-white">The Case Narrative</h3>
            <p className="text-xs text-blue-300/75 mt-0.5">Chronological milestones, strategic decisions, and evidentiary sources.</p>
          </div>
          <div className="text-xs text-blue-300/70 font-mono">
            {filteredEvents.length} {filteredEvents.length === 1 ? "milestone" : "milestones"}
          </div>
        </div>

        {/* Vertical Timeline Thread */}
        <div className="relative pl-2 sm:pl-4">
          {/* Neon Track Line */}
          <div className="absolute left-[88px] sm:left-[116px] top-6 bottom-6 w-[2px] bg-gradient-to-b from-sky-400 via-amber-400 to-emerald-400 opacity-60" />

          <div className="space-y-8 relative">
            {filteredEvents.map((item) => {
              const neon = getNeonStyles(item.categoryColor || "blue");
              const dateObj = new Date(item.eventDate);
              const datePart = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
              const timePart = dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
              const isAction = item.isActionNeeded || item.eventType === "next_step";
              const parsedSources: Array<{ type: string; label: string; url?: string; excerpt?: string }> = item.sources
                ? JSON.parse(item.sources)
                : [];

              return (
                <div
                  key={item.id}
                  id={`timeline-node-${item.id}`}
                  className="flex items-start gap-4 sm:gap-6 group"
                >
                  {/* Left Column: Date / Time or Next Step indicator */}
                  <div className="w-16 sm:w-20 shrink-0 text-right pt-2 font-mono">
                    {isAction ? (
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-[#F5B544] block">Next Step</span>
                        <span className="text-[10px] text-amber-300 font-semibold block">Action Needed</span>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-white block">{datePart}</span>
                        <span className="text-[10px] text-blue-300/70 block">{timePart}</span>
                      </div>
                    )}
                  </div>

                  {/* Center Glowing Node */}
                  <div className="relative shrink-0 pt-2.5 z-10">
                    <div className={`w-3.5 h-3.5 rounded-full border-2 border-white ${neon.glowDot}`} />
                  </div>

                  {/* Right Event Card */}
                  <div className={`flex-1 rounded-2xl border bg-[#051429] p-4 sm:p-5 transition-all shadow-lg hover:shadow-2xl ${neon.cardBorder}`}>
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      {/* Event Details */}
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl shrink-0 ${neon.iconBox}`}>
                            {getEventIcon(item.eventType, item.categoryColor || "blue")}
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-sm sm:text-base leading-snug">{item.title}</h4>
                            <p className="text-xs sm:text-[13px] text-blue-100/85 mt-0.5 leading-relaxed">{item.description}</p>
                          </div>
                        </div>

                        {/* WHY PILL / CALLOUT (Crucial requirement: explains why it happened) */}
                        {item.whyReason && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#082042] border border-blue-700/60 text-xs text-blue-200 mt-1">
                            <span className="font-bold text-amber-300">Why:</span>
                            <span>{item.whyReason}</span>
                          </div>
                        )}

                        {/* Verbatim Quote Excerpt if present */}
                        {item.quoteText && (
                          <div className="rounded-xl border border-purple-800/40 bg-purple-950/30 p-3 italic text-xs text-purple-200 leading-relaxed mt-2">
                            {item.quoteText}
                          </div>
                        )}
                      </div>

                      {/* Right Columns: Owner, Source Links, Next Step Actions */}
                      <div className="flex flex-wrap lg:flex-nowrap items-center lg:items-start gap-4 sm:gap-6 shrink-0 pt-1 border-t lg:border-t-0 border-blue-900/40 lg:pl-4">
                        {/* Owner Column */}
                        <div className="min-w-[110px]">
                          <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider block">Owner</span>
                          <span className="text-xs font-semibold text-white block mt-0.5">{item.ownerName}</span>
                          <span className="text-[10px] text-blue-300/70 block">{item.ownerRole || "Staff"}</span>
                        </div>

                        {/* Source(s) or Action Complete Column */}
                        <div className="min-w-[130px] space-y-1.5">
                          {isAction ? (
                            <div>
                              <Button
                                size="sm"
                                onClick={() => toggleCompleteMutation.mutate({ id: item.id, isCompleted: !item.isCompleted })}
                                className={`h-8 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                                  item.isCompleted
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/30"
                                    : "bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-[0_0_12px_rgba(245,181,68,0.3)]"
                                }`}
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3] mr-1" />
                                <span>{item.isCompleted ? "Completed" : "Mark Complete"}</span>
                              </Button>
                            </div>
                          ) : (
                            <div>
                              <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider block">
                                {parsedSources.length > 1 ? "Sources" : "Source"}
                              </span>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                {parsedSources.length === 0 ? (
                                  <span className="text-xs text-blue-300/70">Direct entry</span>
                                ) : (
                                  parsedSources.map((src, sIdx) => (
                                    <button
                                      key={sIdx}
                                      type="button"
                                      onClick={() =>
                                        setSelectedSourceModal({
                                          title: src.label,
                                          type: src.type,
                                          excerpt: src.excerpt || `Recorded source for "${item.title}" in Kylie's student case.`,
                                        })
                                      }
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-950/80 border border-blue-800/80 hover:border-sky-400/60 text-[11px] text-blue-200 hover:text-white transition-all cursor-pointer"
                                    >
                                      {src.type === "call" && <Phone className="w-3 h-3 text-emerald-400" />}
                                      {src.type === "email" && <Mail className="w-3 h-3 text-sky-400" />}
                                      {src.type === "note" && <FileText className="w-3 h-3 text-amber-400" />}
                                      {src.type === "task" && <CheckSquare className="w-3 h-3 text-yellow-400" />}
                                      <span>{src.label}</span>
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Three Dots Action Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="w-8 h-8 rounded-lg text-blue-400 hover:text-white hover:bg-blue-900/50 flex items-center justify-center cursor-pointer transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#071C38] border-blue-800 text-white text-xs">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedSourceModal({
                                  title: item.title,
                                  type: item.eventType,
                                  excerpt: `${item.description}\n\nWhy: ${item.whyReason || "None provided"}\nOwner: ${item.ownerName}`,
                                });
                              }}
                              className="hover:bg-blue-900/60 cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5 mr-2 text-sky-400" />
                              <span>View Full Record</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => toggleCompleteMutation.mutate({ id: item.id, isCompleted: !item.isCompleted })}
                              className="hover:bg-blue-900/60 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-400" />
                              <span>{item.isCompleted ? "Mark Incomplete" : "Mark Complete"}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteEventMutation.mutate({ id: item.id })}
                              className="hover:bg-rose-900/50 text-rose-300 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2 text-rose-400" />
                              <span>Delete Entry</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 6. ADD ENTRY MODAL ── */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-lg bg-[#061830] border border-blue-800/80 text-white shadow-2xl rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-400/15 text-amber-400 border border-amber-400/30">
                <Plus className="w-4 h-4 stroke-[3]" />
              </div>
              <div>
                <DialogTitle className="text-lg font-serif font-bold text-white">Add Activity Timeline Entry</DialogTitle>
                <p className="text-xs text-blue-300/80">Record a case milestone, document exchange, or communication.</p>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSaveEntry} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs text-blue-200 font-semibold">Title *</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Speech Evaluation Request Sent"
                className="bg-blue-950/80 border-blue-800/80 text-white rounded-xl text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-blue-200 font-semibold">Category Type</Label>
                <select
                  value={formEventType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormEventType(val);
                    if (val === "strategy_decision") setFormCategoryColor("amber");
                    else if (val === "client_contact") setFormCategoryColor("teal");
                    else if (val === "evaluation_request") setFormCategoryColor("blue");
                    else if (val === "school_response") setFormCategoryColor("purple");
                    else if (val === "next_step") setFormCategoryColor("yellow");
                  }}
                  className="w-full bg-blue-950/80 border border-blue-800/80 text-white rounded-xl text-xs px-3 py-2 outline-none"
                >
                  <option value="strategy_decision">Strategy Decision</option>
                  <option value="client_contact">Client Contacted</option>
                  <option value="evaluation_request">Evaluation Request</option>
                  <option value="school_response">School Response</option>
                  <option value="next_step">Next Step / Action Needed</option>
                  <option value="consultation">Consultation</option>
                  <option value="general">General Case Activity</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-blue-200 font-semibold">Accent Color</Label>
                <select
                  value={formCategoryColor}
                  onChange={(e) => setFormCategoryColor(e.target.value)}
                  className="w-full bg-blue-950/80 border border-blue-800/80 text-white rounded-xl text-xs px-3 py-2 outline-none"
                >
                  <option value="blue">Neon Blue (Communications)</option>
                  <option value="amber">Neon Amber (Strategy)</option>
                  <option value="teal">Neon Teal (Client Calls)</option>
                  <option value="purple">Neon Purple (School Responses)</option>
                  <option value="cyan">Neon Cyan (Consultations)</option>
                  <option value="yellow">Gold / Yellow (Action Needed)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-blue-200 font-semibold">Description *</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="What happened in the case? Describe clearly so any advocate understands immediately."
                className="bg-blue-950/80 border-blue-800/80 text-white rounded-xl text-xs min-h-[60px]"
                required
              />
            </div>

            {/* Crucial WHY REASON block */}
            <div className="space-y-1 rounded-xl border border-blue-700/50 bg-blue-950/60 p-3">
              <Label className="text-xs text-amber-200 font-semibold flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>Why did it happen? (Strategic Rationale)</span>
              </Label>
              <Input
                value={formWhyReason}
                onChange={(e) => setFormWhyReason(e.target.value)}
                placeholder="e.g. Allow DPR evaluation window to open before routine review..."
                className="bg-[#030C19] border-blue-800/80 text-white rounded-xl text-xs"
              />
              <p className="text-[11px] text-blue-300/70">Answers the key advocate question: Why did we take this action?</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-blue-200 font-semibold">Owner Name</Label>
                <Input
                  value={formOwnerName}
                  onChange={(e) => setFormOwnerName(e.target.value)}
                  placeholder="Byron Clausen"
                  className="bg-blue-950/80 border-blue-800/80 text-white rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-blue-200 font-semibold">Sources (comma separated)</Label>
                <Input
                  value={formSourcesText}
                  onChange={(e) => setFormSourcesText(e.target.value)}
                  placeholder="Call transcript, Note, Email"
                  className="bg-blue-950/80 border-blue-800/80 text-white rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-blue-200 font-semibold">Quote / Verbatim Excerpt (Optional)</Label>
              <Input
                value={formQuoteText}
                onChange={(e) => setFormQuoteText(e.target.value)}
                placeholder='"School stated they will proceed with MTSS data dig..."'
                className="bg-blue-950/80 border-blue-800/80 text-white rounded-xl text-xs"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                className="border-blue-800/80 text-blue-300 hover:bg-blue-900/50 rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createEventMutation.isPending}
                className="bg-[#F5B544] hover:bg-[#F5B544]/90 text-slate-950 font-bold rounded-xl text-xs shadow-md"
              >
                Save Milestone
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── 7. LOG STRATEGY DECISION MODAL (SPECIALIZED FOR ADVOCATES) ── */}
      <Dialog open={isLogDecisionOpen} onOpenChange={setIsLogDecisionOpen}>
        <DialogContent className="sm:max-w-md bg-[#061830] border border-blue-800/80 text-white shadow-2xl rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-400/20 text-amber-400 border border-amber-400/40">
                <Lightbulb className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-serif font-bold text-white">Log Strategy Decision</DialogTitle>
                <p className="text-xs text-blue-300/80">Capture an advocate recommendation, case pivot, or tactical rationale.</p>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSaveEntry} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs text-blue-200 font-semibold">Strategic Recommendation *</Label>
              <Input
                value={formTitle}
                onChange={(e) => {
                  setFormTitle(e.target.value);
                  setFormEventType("strategy_decision");
                  setFormCategoryColor("amber");
                }}
                placeholder="e.g. Postpone Upcoming Meeting During DPR Initiation"
                className="bg-blue-950/80 border-blue-800/80 text-white rounded-xl text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-amber-200 font-semibold">Why: Strategic Rationale *</Label>
              <Textarea
                value={formWhyReason}
                onChange={(e) => setFormWhyReason(e.target.value)}
                placeholder="Why did we make this decision? (e.g. Preserve state evaluation timeline rights, avoid premature goal finalization...)"
                className="bg-blue-950/80 border-amber-400/40 text-white rounded-xl text-xs min-h-[70px]"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-blue-200 font-semibold">Action Description *</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Recommended postponing the upcoming meeting while the Direct Parent Request process begins..."
                className="bg-blue-950/80 border-blue-800/80 text-white rounded-xl text-xs min-h-[60px]"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-blue-200 font-semibold">Next Step Arising From Decision</Label>
              <Input
                value={formNextStep}
                onChange={(e) => setFormNextStep(e.target.value)}
                placeholder="e.g. Request 3 alternate dates from school"
                className="bg-blue-950/80 border-blue-800/80 text-white rounded-xl text-xs"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsLogDecisionOpen(false)}
                className="border-blue-800/80 text-blue-300 hover:bg-blue-900/50 rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createEventMutation.isPending}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs shadow-md"
              >
                Log Decision
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── 8. SOURCE VIEWER MODAL ── */}
      <Dialog open={!!selectedSourceModal} onOpenChange={(open) => !open && setSelectedSourceModal(null)}>
        <DialogContent className="sm:max-w-md bg-[#061830] border border-blue-800/80 text-white shadow-2xl rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-sky-400/20 text-sky-400 border border-sky-400/40">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-serif font-bold text-white">
                  Source Evidence Record
                </DialogTitle>
                <p className="text-xs text-blue-300/80">
                  {selectedSourceModal?.title} • {selectedSourceModal?.type.toUpperCase()}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="py-3 space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-blue-950/70 border border-blue-800/80 leading-relaxed text-blue-100 whitespace-pre-wrap">
              {selectedSourceModal?.excerpt || "No further excerpt details available."}
            </div>
            <p className="text-[11px] text-blue-300/70">
              Verified in {studentName}&apos;s case workspace. Original files remain permanently archived in Document Vault &amp; Communications.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => setSelectedSourceModal(null)}
              className="w-full bg-blue-900/50 hover:bg-blue-800/60 border border-blue-700/60 text-white rounded-xl text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 9. FILTERS MODAL ── */}
      <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DialogContent className="sm:max-w-md bg-[#061830] border border-blue-800/80 text-white shadow-2xl rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-sky-400/20 text-sky-400 border border-sky-400/40">
                <Filter className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-serif font-bold text-white">Timeline Filters</DialogTitle>
                <p className="text-xs text-blue-300/80">Refine the case story by category, keyword, or actor.</p>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2 space-y-3 text-xs">
            <div className="space-y-1">
              <Label className="text-xs text-blue-200 font-semibold">Search Keywords</Label>
              <Input
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search by keyword, why rationale, or owner..."
                className="bg-blue-950/80 border-blue-800/80 text-white rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-blue-200 font-semibold">Filter by Category</Label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full bg-blue-950/80 border border-blue-800/80 text-white rounded-xl text-xs px-3 py-2 outline-none"
              >
                <option value="all">All Events &amp; Milestones</option>
                <option value="strategy_decision">Strategy Decisions</option>
                <option value="client_contact">Client Communications</option>
                <option value="evaluation_request">Evaluation Requests</option>
                <option value="school_response">School Responses</option>
                <option value="next_step">Next Steps &amp; Action Needed</option>
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFilterCategory("all");
                setSearchFilter("");
                setIsFilterOpen(false);
              }}
              className="border-blue-800/80 text-blue-300 hover:bg-blue-900/50 rounded-xl text-xs"
            >
              Reset Filters
            </Button>
            <Button
              type="button"
              onClick={() => setIsFilterOpen(false)}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs shadow-md"
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
