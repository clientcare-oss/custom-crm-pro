import React, { useState, useRef, useEffect } from "react";
import {
  Ban,
  ShieldAlert,
  Save,
  Copy,
  Plus,
  Trash2,
  ListPlus,
  AlertOctagon,
  Sparkles,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ParentDoesntWantBoxProps {
  content: string;
  onChangeContent: (text: string) => void;
  onSaveContent: () => Promise<void>;
  isSaving: boolean;
  isDirty: boolean;
  className?: string;
}

// Preset advocate boundary recommendations that can be added with 1 click
const COMMON_BOUNDARIES = [
  {
    label: "No Speech Reductions",
    text: "• Reject any reduction in Speech-Language therapy minutes without updated objective standardized testing.",
  },
  {
    label: "No Restrictive LRE Placement",
    text: "• Explicitly refuse segregated resource or self-contained placement for lunch, specials, or general education core hours.",
  },
  {
    label: "Preserve 1:1 Paraprofessional",
    text: "• Do NOT agree to removing or diluting 1-on-1 adult support during unstructured transitions and cafeteria periods.",
  },
  {
    label: "Prohibit Restraints & Seclusion",
    text: "• Strictly refuse any physical restraint, prone restraint, or isolated seclusion timeout rooms under all circumstances.",
  },
  {
    label: "Preserve Sensory & OT Accommodations",
    text: "• Oppose removing sensory diet breaks, noise-canceling headphones, and occupational therapy accommodations.",
  },
  {
    label: "Require Prior Written Notice",
    text: "• If school team refuses any parent-requested evaluation or accommodation, formally demand written refusal in a Prior Written Notice (PWN) before ending the meeting.",
  },
];

export function ParentDoesntWantBox({
  content,
  onChangeContent,
  onSaveContent,
  isSaving,
  isDirty,
  className,
}: ParentDoesntWantBoxProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPresets, setShowPresets] = useState(false);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const lineCount = content.trim() ? content.trim().split("\n").filter((l) => l.trim().length > 0).length : 0;

  const handleCopy = () => {
    if (!content.trim()) {
      toast.error("Nothing to copy yet. Add parent non-negotiables first.");
      return;
    }
    navigator.clipboard.writeText(content);
    toast.success("What Parent Doesn't Want copied to clipboard!");
  };

  const handleInsertBullet = () => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChangeContent(content ? `${content}\n• ` : "• ");
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const bullet = content && !content.endsWith("\n") ? "\n• " : "• ";
    const nextContent = content.substring(0, start) + bullet + content.substring(end);
    onChangeContent(nextContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + bullet.length, start + bullet.length);
    }, 50);
  };

  const handleAddPreset = (presetText: string) => {
    if (content.includes(presetText.trim())) {
      toast.info("This non-negotiable is already in the list.");
      return;
    }
    const updated = content.trim() ? `${content.trim()}\n${presetText}` : presetText;
    onChangeContent(updated);
    toast.success("Non-negotiable added to list");
  };

  return (
    <div
      className={cn(
        "rounded-xl bg-[#170509]/95 border border-[#52161E] shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,100,100,0.06)] p-5 sm:p-6 space-y-4 transition-all hover:border-[#6F1E28]",
        className
      )}
    >
      {/* ── Section Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#401217]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#240A10] border border-[#5A1720] text-rose-300 flex-shrink-0 shadow-inner">
            <Ban className="w-5 h-5 text-rose-300" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base sm:text-lg font-serif font-black text-[#FFE6E8] tracking-wide flex items-center gap-2">
                <span>🚫 What the Parent Doesn't Want</span>
              </h2>
              <Badge
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider font-mono transition-all",
                  isDirty
                    ? "bg-rose-500/25 text-rose-200 border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.3)] animate-pulse"
                    : "bg-[#280A12] text-rose-300/80 border-[#5A1720]"
                )}
              >
                {isDirty ? "UNSAVED EDITS" : "PARENT DEALBREAKERS"}
              </Badge>
            </div>
            <p className="text-xs text-rose-200/70 mt-0.5 leading-relaxed">
              Explicit parent boundaries, rejected district proposals, service reductions to oppose, and non-negotiable red lines.
            </p>
          </div>
        </div>

        {/* Preset suggestions toggle */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowPresets((prev) => !prev)}
          className={cn(
            "h-8 px-3 text-xs font-semibold gap-1.5 transition-all cursor-pointer shadow-sm self-start sm:self-auto border",
            showPresets
              ? "bg-[#3D0F18] text-rose-100 border-rose-400/60 shadow-sm"
              : "border-[#4A131A] bg-[#20080E] text-rose-200 hover:bg-[#2E0B14] hover:text-[#FFF] hover:border-rose-400/40"
          )}
          title="Toggle common special education advocacy boundaries"
        >
          <Sparkles className="w-3.5 h-3.5 text-rose-300" />
          <span>{showPresets ? "Hide Quick Boundaries" : "Quick Boundaries"}</span>
        </Button>
      </div>

      {/* ── Preset Boundaries Drawer ───────────────────────────────────────── */}
      {showPresets && (
        <div className="bg-[#240A10]/90 border border-[#5A1720] rounded-lg p-3 space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-300" />
              Common Advocacy Red Lines (Click to Add):
            </span>
            <span className="text-[10px] text-rose-300/60">One-click insert</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_BOUNDARIES.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAddPreset(preset.text)}
                className="text-left text-[11px] px-2.5 py-1 rounded-md bg-[#160509] border border-[#52161E] hover:border-rose-400 text-rose-200 hover:text-white transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-3 h-3 text-rose-400 shrink-0" />
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Advocate Action Bar ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#20080E]/80 border border-[#401217] px-3 py-2 rounded-lg">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Add Bullet Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleInsertBullet}
            className="h-7 text-xs text-rose-200 hover:text-white hover:bg-[#330C15] gap-1.5 px-2.5 cursor-pointer"
            title="Insert a new bullet point"
          >
            <ListPlus className="w-3.5 h-3.5 text-rose-400" />
            <span>+ Bullet</span>
          </Button>

          {/* Save Button */}
          <Button
            type="button"
            size="sm"
            onClick={onSaveContent}
            disabled={isSaving}
            className={cn(
              "h-7 text-xs font-bold gap-1.5 px-3 cursor-pointer shadow-sm transition-all border",
              isDirty
                ? "bg-gradient-to-r from-rose-700 via-rose-600 to-rose-800 text-white border-rose-400/50 hover:brightness-110"
                : "bg-[#280A12] border-[#5A1720] text-rose-200 hover:bg-[#380E1A]"
            )}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? "Saving..." : isDirty ? "Save Non-Negotiables" : "Saved"}</span>
          </Button>

          {/* Copy Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 text-xs text-rose-200 hover:text-white hover:bg-[#330C15] gap-1.5 px-2.5 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-rose-400" />
            <span>Copy</span>
          </Button>
        </div>

        {/* Counter */}
        <div className="text-[11px] text-rose-300/70 flex items-center gap-2 font-mono">
          <span>{lineCount} items</span>
          <span>•</span>
          <span>{wordCount} words</span>
        </div>
      </div>

      {/* ── Main Working Area (Muted Wine Red Box) ─────────────────────────── */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onChangeContent(e.target.value)}
          placeholder={`Document what the parent DOES NOT want or will refuse:
• Reject reducing Speech therapy from 60 to 30 min/week.
• Refuse isolated resource room placement for lunch and specials.
• Explicitly refuse any physical restraint or seclusion timeout rooms.
• Do not agree to removing 1:1 adult aide during hallway transitions.`}
          className="w-full min-h-[240px] sm:min-h-[280px] bg-[#0E0205] border border-[#48131B] focus:border-rose-500/80 text-[#FFEAEB] placeholder:text-rose-400/35 font-sans text-sm sm:text-base leading-relaxed p-4 sm:p-5 rounded-xl shadow-inner outline-none focus:ring-2 focus:ring-rose-500/20 resize-y"
        />
      </div>

      {/* Footer reassurance note */}
      <div className="flex items-center gap-2 text-[11px] text-rose-300/60 pt-0.5">
        <Info className="w-3.5 h-3.5 text-rose-400/70 shrink-0" />
        <span>
          These non-negotiables are automatically preserved in the meeting workspace and synced across Cloudflare D1.
        </span>
      </div>
    </div>
  );
}
