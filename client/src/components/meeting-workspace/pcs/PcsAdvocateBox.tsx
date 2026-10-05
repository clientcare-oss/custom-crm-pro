import React, { useState, useRef, useEffect } from "react";
import {
  FileText,
  Edit3,
  Save,
  Copy,
  ClipboardPaste,
  Mail,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { PcsStatus } from "./types";

interface PcsAdvocateBoxProps {
  content: string;
  status: PcsStatus;
  isDetailsOpen: boolean;
  onToggleDetails: () => void;
  onChangeContent: (text: string) => void;
  onSaveContent: () => Promise<void>;
  onOpenPasteReplace: () => void;
  onOpenEmailToParent: () => void;
  isSaving: boolean;
  isDirty: boolean;
}

export function PcsAdvocateBox({
  content,
  status,
  isDetailsOpen,
  onToggleDetails,
  onChangeContent,
  onSaveContent,
  onOpenPasteReplace,
  onOpenEmailToParent,
  isSaving,
  isDirty,
}: PcsAdvocateBoxProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast.success("Parent Concern Statement copied to clipboard!");
  };

  const handleFocusEdit = () => {
    setIsEditing(true);
    textareaRef.current?.focus();
  };

  return (
    <div className="rounded-xl bg-[#05142B]/90 border border-[#3A2C18] shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] p-5 sm:p-6 space-y-4">
      {/* ── Section Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#3A2C18]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#020A17] border border-[#3A2C18] text-[#DFBE77] flex-shrink-0">
            <FileText className="w-5 h-5 text-[#DFBE77]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base sm:text-lg font-serif font-black text-[#FFF4D4] tracking-wide">
                📝 Parent Concern Statement
              </h2>
              <Badge
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider font-mono",
                  isDirty
                    ? "bg-[#C5A059]/20 text-[#FFE394] border-[#C5A059]/40"
                    : status === "READY"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-[#020A17] text-[#FFE394] border-[#3A2C18]"
                )}
              >
                {isDirty ? "UNSAVED EDITS" : status}
              </Badge>
            </div>
            <p className="text-xs text-[#C6B697] mt-0.5">
              Live advocate working statement with the parent. Edit directly, paste rewrites, or email to family.
            </p>
          </div>
        </div>

        {/* Details Toggle Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onToggleDetails}
          className={cn(
            "h-8 px-3 text-xs font-semibold gap-1.5 transition-all cursor-pointer shadow-sm self-start sm:self-auto border",
            isDetailsOpen
              ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border-[#FFE394]/50 shadow-sm"
              : "border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] hover:border-[#C5A059]/60"
          )}
          title="Open behind-the-scenes AI evidence and analysis"
        >
          <span>Details</span>
          <ChevronRight
            className={cn("w-3.5 h-3.5 transition-transform duration-200", isDetailsOpen && "rotate-90 text-[#07162B]")}
          />
        </Button>
      </div>

      {/* ── Advocate Action Bar ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#020A17]/80 border border-[#3A2C18]/60 px-3 py-2 rounded-lg">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Edit Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleFocusEdit}
            className="h-7 text-xs text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#071E3D] gap-1.5 px-2.5 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#DFBE77]" />
            <span>Edit</span>
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
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border-[#FFE394]/50 hover:brightness-105"
                : "bg-[#05142B] border-[#3A2C18] text-[#FFE394] hover:bg-[#071E3D]"
            )}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? "Saving..." : isDirty ? "Save Changes" : "Saved"}</span>
          </Button>

          {/* Copy Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 text-xs text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#071E3D] gap-1.5 px-2.5 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-[#DFBE77]" />
            <span>Copy</span>
          </Button>

          {/* Paste / Replace Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenPasteReplace}
            className="h-7 text-xs border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] hover:border-[#C5A059]/60 gap-1.5 px-2.5 cursor-pointer font-medium"
            title="Paste in a rewritten statement from external LLMs without erasing evidence"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-[#DFBE77]" />
            <span>Paste / Replace</span>
          </Button>

          {/* Email to Parent Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenEmailToParent}
            className="h-7 text-xs border border-teal-500/50 bg-[#021A1A] text-teal-300 hover:text-white hover:bg-teal-950/60 gap-1.5 px-2.5 cursor-pointer font-medium"
            title="Prepare and email this draft directly to the parent for review"
          >
            <Mail className="w-3.5 h-3.5 text-teal-400" />
            <span>Email to Parent</span>
          </Button>
        </div>

        {/* Counter */}
        <div className="text-[11px] text-[#A69371] flex items-center gap-2 font-mono">
          <span>{wordCount} words</span>
          <span>•</span>
          <span>{charCount} chars</span>
        </div>
      </div>

      {/* ── Main Working Statement (Directly Editable Area) ────────────────── */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            onChangeContent(e.target.value);
            setIsEditing(true);
          }}
          placeholder="Type or review the Parent Concern Statement here. The advocate can edit live with the parent without opening Details..."
          className="w-full min-h-[240px] sm:min-h-[280px] bg-[#010812] border border-[#3A2C18] focus:border-[#C5A059]/80 text-[#FFF4D4] placeholder:text-[#A69371] font-sans text-sm sm:text-base leading-relaxed p-4 sm:p-5 rounded-xl shadow-inner outline-none focus:ring-2 focus:ring-[#C5A059]/20 resize-y"
        />
      </div>
    </div>
  );
}
