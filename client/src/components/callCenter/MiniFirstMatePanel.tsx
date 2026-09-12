import React, { useState } from "react";
import {
  Sparkles,
  ExternalLink,
  Copy,
  PlusCircle,
  Check,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ArrowRight,
  Loader2,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { MarineRadarIcon } from "@/components/ui/MarineRadarIcon";
import { useAuth } from "@/_core/hooks/useAuth";

interface MiniFirstMatePanelProps {
  onAddToNotes?: (text: string) => void;
  clientContextName?: string;
}

export function MiniFirstMatePanel({
  onAddToNotes,
  clientContextName,
}: MiniFirstMatePanelProps) {
  const { user } = useAuth();
  const userName = user?.name ? user.name.split(" ")[0] : "Byron";

  const [query, setQuery] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customResponse, setCustomResponse] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  // Suggested default opening matching reference mockup
  const defaultOpening = `Hi, this is ${userName} with Waypoint Advocates. How can I help you today?`;

  const defaultQuestions = [
    "How did you hear about us?",
    "What can we help you with?",
    "Have you or your child received any evaluations?",
    "What school or district are you working with?",
    "What are your next steps?",
  ];

  const defaultNextSteps = [
    "Summarize the conversation",
    "Log notes in the client record",
    "Schedule a follow-up or evaluation",
    "Send additional information",
    "Create a task for the team",
  ];

  const handleCopyOpening = () => {
    navigator.clipboard.writeText(defaultOpening);
    setCopied(true);
    toast.success("Suggested opening copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddOpeningToNotes = () => {
    if (onAddToNotes) {
      onAddToNotes(`Opening Used: "${defaultOpening}"\n`);
      toast.success("Opening added to Call Intake notes");
    }
  };

  const handleAddChecklistToNotes = () => {
    if (onAddToNotes) {
      const questionsText = `Questions to Ask:\n${defaultQuestions.map((q) => `• ${q}`).join("\n")}\n\nNext Steps:\n${defaultNextSteps.map((s) => `• ${s}`).join("\n")}\n`;
      onAddToNotes(questionsText);
      toast.success("Guidance checklist appended to notes");
    }
  };

  const handleQuickAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsThinking(true);
    // Simple heuristic or tRPC firstMate assistance
    setTimeout(() => {
      setIsThinking(false);
      const q = query.toLowerCase();
      if (q.includes("iep") || q.includes("evaluation")) {
        setCustomResponse(
          "Ask if the school provided a Prior Written Notice (PWN) within 60 days. Recommend reviewing recent psychoeducational scores."
        );
      } else if (q.includes("pricing") || q.includes("cost") || q.includes("retainer")) {
        setCustomResponse(
          "Discovery calls are complimentary (15-30m). Tiered advocacy retainer starts after document review and strategy alignment."
        );
      } else {
        setCustomResponse(
          `For ${query}: Clarify parent's primary goal, identify if this is a timeline violation, and schedule a 30m Discovery Call.`
        );
      }
    }, 600);
  };

  return (
    <div className="rounded-2xl bg-[#061830] border border-sky-500/20 shadow-lg flex flex-col justify-between overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-[#061830] to-[#092244] border-b border-sky-500/15 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.2)] flex-shrink-0">
            <MarineRadarIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              First Mate
            </div>
            <div className="text-[11px] font-semibold text-emerald-400 leading-tight">
              Quick Call Assist
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMinimized(!isMinimized)}
          className="h-7 w-7 p-0 text-slate-400 hover:text-white rounded-lg"
          title={isMinimized ? "Expand Panel" : "Minimize Panel"}
        >
          {isMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </div>

      {!isMinimized && (
        <div className="p-4 space-y-4 flex-1 flex flex-col justify-between">
          {/* Query Input Box */}
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-white">
              What are you working on?
            </div>
            <form onSubmit={handleQuickAsk} className="relative">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a client name, topic, or question..."
                className="bg-[#040D1A] border-slate-800 text-white placeholder:text-slate-500 text-xs rounded-xl focus:border-amber-400 pr-8 h-9"
              />
              <button
                type="submit"
                disabled={isThinking || !query.trim()}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sky-400 hover:text-amber-300 disabled:opacity-40"
              >
                {isThinking ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5" />
                )}
              </button>
            </form>
          </div>

          {/* Dynamic AI Custom Response Card if query asked */}
          {customResponse && (
            <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/30 text-xs text-amber-200 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between font-bold text-amber-300">
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  First Mate Suggestion
                </span>
                <button
                  onClick={() => setCustomResponse(null)}
                  className="text-amber-300/70 hover:text-white text-[10px]"
                >
                  Dismiss
                </button>
              </div>
              <p className="leading-relaxed">{customResponse}</p>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (onAddToNotes) {
                      onAddToNotes(`First Mate Tip: ${customResponse}\n`);
                      toast.success("Tip added to notes");
                    }
                  }}
                  className="border-amber-400/30 text-amber-300 hover:bg-amber-400/20 text-[10px] h-6 px-2 rounded-md"
                >
                  Add to Notes
                </Button>
              </div>
            </div>
          )}

          {/* Suggested Opening matching mockup */}
          <div className="space-y-1">
            <div className="text-xs font-bold text-amber-400">
              Suggested opening:
            </div>
            <div className="p-2.5 rounded-xl bg-[#040D1A]/80 border border-slate-800 text-xs text-slate-200 italic leading-relaxed">
              "{defaultOpening}"
            </div>
          </div>

          {/* Questions to Ask matching mockup */}
          <div className="space-y-1">
            <div className="text-xs font-bold text-amber-400">
              Questions to ask:
            </div>
            <ul className="text-xs text-slate-300 space-y-1 pl-1">
              {defaultQuestions.map((q, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-sky-400 mt-1">•</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Next Steps matching mockup */}
          <div className="space-y-1">
            <div className="text-xs font-bold text-amber-400">
              Next steps:
            </div>
            <ul className="text-xs text-slate-300 space-y-1 pl-1">
              {defaultNextSteps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-emerald-400 mt-1">•</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons: Add to Notes + Copy Opening */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddChecklistToNotes}
              className="border-sky-500/30 text-sky-300 hover:bg-sky-500/10 text-xs font-semibold h-8 rounded-xl gap-1"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Add to Notes
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyOpening}
              className="border-sky-500/30 text-sky-300 hover:bg-sky-500/10 text-xs font-semibold h-8 rounded-xl gap-1"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy Opening"}
            </Button>
          </div>

          {/* Open Full First Mate Primary Button */}
          <div className="pt-1">
            <Button
              onClick={() => {
                window.location.href = "/first-mate";
              }}
              className="w-full bg-transparent hover:bg-amber-400/10 border border-amber-400/50 text-amber-300 font-bold h-9 rounded-xl text-xs gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.1)] transition-all"
            >
              <span>Open Full First Mate</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MiniFirstMatePanel;
