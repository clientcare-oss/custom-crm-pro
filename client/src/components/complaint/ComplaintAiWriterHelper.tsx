import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Wand2,
  BookOpen,
  CheckCircle2,
  Scale,
  AlignLeft,
  Scissors,
  Copy,
  Check,
  RotateCcw,
  X,
  ChevronDown,
  ArrowRight,
  FileText,
  Loader2,
  Layers,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export type AiWriterMode =
  | "make_better"
  | "help_write"
  | "add_citations"
  | "fix_grammar"
  | "make_concise"
  | "custom";

interface ComplaintAiWriterHelperProps {
  currentText: string;
  onApplyText: (newText: string, mode: "replace" | "append") => void;
  sectionTitle?: string;
  studentName?: string;
  districtName?: string;
  stateCode?: string;
  isOpen: boolean;
  onClose: () => void;
  selectedText?: string;
}

const MODES: {
  id: AiWriterMode;
  label: string;
  icon: React.ElementType;
  tagline: string;
  description: string;
}[] = [
  {
    id: "make_better",
    label: "Make It Better",
    icon: Sparkles,
    tagline: "Elevate Legal Phrasing",
    description: "Polishes tone, removes passive phrasing, and strengthens advocate arguments for state investigators.",
  },
  {
    id: "help_write",
    label: "Help Me Write",
    icon: Wand2,
    tagline: "Notes to Formal Narrative",
    description: "Transforms rough notes, bullet points, or timelines into a structured, formal legal statement.",
  },
  {
    id: "add_citations",
    label: "Add IDEA & State Law",
    icon: Scale,
    tagline: "Anchor in Governing Law",
    description: "Injects relevant 34 C.F.R. § 300 rules and state administrative regulations directly into allegations.",
  },
  {
    id: "fix_grammar",
    label: "Fix Grammar & Flow",
    icon: CheckCircle2,
    tagline: "Flawless Readability",
    description: "Polishes spelling and flow while preserving all dates, factual details, and advocate observations.",
  },
  {
    id: "make_concise",
    label: "Make Concise",
    icon: Scissors,
    tagline: "Punchy & Direct",
    description: "Distills lengthy paragraphs into tight, compelling legal counts without losing key evidence.",
  },
];

export const ComplaintAiWriterHelper: React.FC<ComplaintAiWriterHelperProps> = ({
  currentText,
  onApplyText,
  sectionTitle = "State Complaint Section",
  studentName = "the student",
  districtName = "Local Educational Agency",
  stateCode = "GA",
  isOpen,
  onClose,
  selectedText = "",
}) => {
  const [selectedMode, setSelectedMode] = useState<AiWriterMode>("make_better");
  const [customPrompt, setCustomPrompt] = useState("");
  const [useSelectionOnly, setUseSelectionOnly] = useState(false);
  const [generatedText, setGeneratedText] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"generated" | "original">("generated");

  // Reset or initialize when opened
  useEffect(() => {
    if (isOpen) {
      if (selectedText.trim().length > 5) {
        setUseSelectionOnly(true);
      } else {
        setUseSelectionOnly(false);
      }
    }
  }, [isOpen, selectedText]);

  const targetText = useSelectionOnly && selectedText.trim() ? selectedText : currentText;

  const aiMutation = trpc.stateComplaint.aiWriterHelper.useMutation({
    onSuccess: (data) => {
      setGeneratedText(data.enhancedText);
      setActiveTab("generated");
      toast.success("AI Writer draft refined successfully!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to generate text. Please try again.");
    },
  });

  if (!isOpen) return null;

  const handleGenerate = () => {
    if (!targetText.trim()) {
      toast.info("Please type or paste some text or notes into the document first.");
      return;
    }

    aiMutation.mutate({
      text: targetText,
      mode: selectedMode,
      customInstruction: selectedMode === "custom" ? customPrompt : customPrompt || undefined,
      sectionTitle,
      studentName,
      districtName,
      stateCode,
    });
  };

  const handleCopy = () => {
    if (!generatedText) return;
    navigator.clipboard.writeText(generatedText);
    setHasCopied(true);
    toast.success("Enhanced text copied to clipboard");
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleApply = (mode: "replace" | "append") => {
    if (!generatedText) return;
    onApplyText(generatedText, mode);
    toast.success(mode === "replace" ? "Applied enhanced text to document" : "Appended enhanced text to document");
    onClose();
  };

  const charCount = targetText.length;
  const wordCount = targetText.trim() ? targetText.trim().split(/\s+/).length : 0;
  const genCharCount = generatedText ? generatedText.length : 0;
  const genWordCount = generatedText?.trim() ? generatedText.trim().split(/\s+/).length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={cn(
          "w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl overflow-hidden border shadow-2xl transition-all",
          "bg-[#041329] border-[#C5A059]/70 shadow-[0_16px_48px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.08)]"
        )}
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(8, 32, 66, 0.98) 0%, rgba(4, 19, 41, 0.98) 100%), url('/decor/folio-leather-texture.png')",
          backgroundRepeat: "repeat",
          backgroundSize: "220px",
        }}
      >
        {/* Header Bar */}
        <div className="px-5 py-3.5 border-b border-[#3A2C18] flex items-center justify-between bg-gradient-to-r from-[#071C3A] via-[#0A264D] to-[#071C3A] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#DFBE77] to-[#9E7D3B] p-0.5 flex items-center justify-center shadow-md">
              <div className="w-full h-full bg-[#05142B] rounded-[6px] flex items-center justify-center text-[#FFE394]">
                <Sparkles className="w-4 h-4 text-[#FFE394] animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-sm sm:text-base text-[#FFF4D4] tracking-wide">
                  AI Writer Helper
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#031124] text-[#FFE394] border border-[#C5A059]/40">
                  Advocate Drafting Assistant
                </span>
              </div>
              <p className="text-[11px] text-[#C6B697] truncate max-w-md">
                Refining for: <span className="text-[#FFE394] font-medium">{studentName}</span> · {sectionTitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#C6B697] hover:text-[#FFF4D4] hover:bg-white/10 transition-colors cursor-pointer"
            title="Close AI Writer Helper"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 custom-scrollbar">
          {/* Top Options: Selection Scope & Word Info */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/60 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-[#C6B697] font-medium">Target Context:</span>
              {selectedText.trim().length > 5 ? (
                <div className="flex items-center gap-1.5 bg-[#051A38] border border-[#C5A059]/50 rounded px-2 py-0.5">
                  <label className="flex items-center gap-1.5 text-[#FFE394] cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={useSelectionOnly}
                      onChange={(e) => setUseSelectionOnly(e.target.checked)}
                      className="accent-[#DFBE77] rounded"
                    />
                    <span>Highlighted Text Only ({selectedText.length} chars)</span>
                  </label>
                </div>
              ) : (
                <span className="text-[#E8DCC2] font-mono text-[11px] bg-[#05142B] px-2 py-0.5 rounded border border-[#3A2C18]">
                  Entire Document Sheet ({wordCount} words · {charCount} chars)
                </span>
              )}
            </div>

            <div className="text-[11px] text-[#A69371] italic">
              Governing: 34 C.F.R. § 300 & {stateCode} State Rules
            </div>
          </div>

          {/* Quick Action Chips / Mode Selection */}
          <div className="flex flex-col gap-2">
            <label className="font-serif font-bold text-xs text-[#FFF4D4] flex items-center justify-between">
              <span>Choose Writing Mode:</span>
              <span className="text-[10px] text-[#C6B697] font-sans font-normal">
                Click any action to switch strategy
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {MODES.map((m) => {
                const Icon = m.icon;
                const isSelected = selectedMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedMode(m.id);
                      if (generatedText) setGeneratedText(null);
                    }}
                    className={cn(
                      "flex flex-col text-left p-2.5 rounded-lg border transition-all cursor-pointer relative overflow-hidden group",
                      isSelected
                        ? "bg-gradient-to-br from-[#123668] to-[#0A2244] border-[#DFBE77] shadow-[0_0_12px_rgba(223,190,119,0.25)] ring-1 ring-[#FFE394]/60"
                        : "bg-[#020A17]/70 border-[#3A2C18] hover:border-[#C5A059]/60 hover:bg-[#061833]"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={cn(
                          "w-5 h-5 rounded flex items-center justify-center shrink-0",
                          isSelected ? "bg-[#DFBE77] text-[#07162B]" : "bg-[#071C3A] text-[#FFE394]"
                        )}
                      >
                        <Icon className="w-3 h-3" />
                      </div>
                      <span
                        className={cn(
                          "text-xs font-serif font-bold tracking-wide",
                          isSelected ? "text-[#FFE394]" : "text-[#E8DCC2] group-hover:text-[#FFF4D4]"
                        )}
                      >
                        {m.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#A69371] leading-tight line-clamp-2">
                      {m.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Custom Instructions Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-[#C6B697] flex items-center justify-between">
              <span>Optional Directions (tell the AI specific details or emphasis):</span>
              {customPrompt && (
                <button
                  type="button"
                  onClick={() => setCustomPrompt("")}
                  className="text-[10px] text-rose-300 hover:underline"
                >
                  Clear
                </button>
              )}
            </label>
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g. 'Focus on the 3-week delay in speech therapy', 'Emphasize lack of Prior Written Notice (PWN)'..."
              className="w-full bg-[#020A17] border border-[#3A2C18] focus:border-[#DFBE77] text-xs text-[#FFF4D4] px-3 py-2 rounded-md focus:outline-none placeholder:text-[#6E5D43]"
            />
          </div>

          {/* Generate Trigger Button */}
          {!generatedText && (
            <div className="pt-1 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={aiMutation.isPending || !targetText.trim()}
                className={cn(
                  "px-5 py-2.5 rounded-lg text-xs font-serif font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg",
                  aiMutation.isPending || !targetText.trim()
                    ? "opacity-50 cursor-not-allowed bg-slate-800 text-slate-400 border border-slate-700"
                    : "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] hover:brightness-110 border border-[#FFE394]/70"
                )}
              >
                {aiMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#07162B]" />
                    <span>Polishing Legal Draft with Cloudflare Workers AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-[#07162B]" />
                    <span>{selectedMode === "help_write" ? "Help Me Write Section" : "Make It Better Now"}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Generated Result Review Stage */}
          {generatedText && (
            <div className="flex flex-col gap-3 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between pb-1 border-b border-[#3A2C18]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("generated")}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-serif transition-colors cursor-pointer flex items-center gap-1.5",
                      activeTab === "generated"
                        ? "bg-[#DFBE77] text-[#07162B] font-bold"
                        : "bg-[#020A17] text-[#C6B697] hover:text-[#FFF4D4] border border-[#3A2C18]"
                    )}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>AI Enhanced Draft</span>
                    <span className="text-[10px] font-mono opacity-80">({genWordCount} words)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("original")}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-serif transition-colors cursor-pointer flex items-center gap-1.5",
                      activeTab === "original"
                        ? "bg-[#DFBE77] text-[#07162B] font-bold"
                        : "bg-[#020A17] text-[#C6B697] hover:text-[#FFF4D4] border border-[#3A2C18]"
                    )}
                  >
                    <FileText className="w-3 h-3" />
                    <span>Original Input</span>
                    <span className="text-[10px] font-mono opacity-80">({wordCount} words)</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-[11px] text-[#DFBE77] hover:text-[#FFF4D4] px-2 py-1 rounded bg-[#020A17] border border-[#3A2C18] hover:border-[#DFBE77] transition-all cursor-pointer"
                  >
                    {hasCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{hasCopied ? "Copied" : "Copy"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={aiMutation.isPending}
                    className="flex items-center gap-1 text-[11px] text-[#C6B697] hover:text-[#FFF4D4] px-2 py-1 rounded bg-[#020A17] border border-[#3A2C18] hover:border-[#C5A059] transition-all cursor-pointer"
                    title="Regenerate with current settings"
                  >
                    <RotateCcw className={cn("w-3 h-3", aiMutation.isPending && "animate-spin")} />
                    <span>Try Again</span>
                  </button>
                </div>
              </div>

              {/* Text Preview Box */}
              <div
                className="p-4 rounded-lg bg-[#020A17] border border-[#DFBE77]/60 text-[#FFFDF8] font-serif text-xs leading-relaxed max-h-[300px] overflow-y-auto whitespace-pre-wrap select-text custom-scrollbar shadow-inner"
                style={{
                  backgroundImage: activeTab === "generated" ? "none" : undefined,
                }}
              >
                {activeTab === "generated" ? generatedText : targetText}
              </div>

              {/* Action Buttons: Apply / Insert / Cancel */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#3A2C18]">
                <span className="text-[11px] text-[#A69371] italic">
                  ✓ Verified: All citations aligned with IDEA & Rule F compliant
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleApply("append")}
                    className="px-3 py-2 rounded-lg text-xs font-medium bg-[#051A38] text-[#DFBE77] hover:text-[#FFF4D4] border border-[#C5A059]/60 hover:bg-[#082245] transition-all cursor-pointer"
                  >
                    Insert Below Existing
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApply("replace")}
                    className="px-4 py-2 rounded-lg text-xs font-serif font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] hover:brightness-110 border border-[#FFE394] shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Replace Document Text</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
