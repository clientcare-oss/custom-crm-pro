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
    <div className="rounded-2xl bg-[#07192F] border border-[#173D68] shadow-2xl p-5 sm:p-6 space-y-4">
      {/* ── Section Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#163860]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[#F5B544] flex-shrink-0">
            <FileText className="w-5 h-5 text-[#F5B544]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                📝 Parent Concern Statement
              </h2>
              <Badge
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider",
                  isDirty
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : status === "READY"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-blue-500/20 text-blue-300 border-blue-500/40"
                )}
              >
                {isDirty ? "UNSAVED EDITS" : status}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
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
            "h-8 px-3 text-xs font-semibold gap-1.5 transition-all cursor-pointer shadow-sm self-start sm:self-auto",
            isDetailsOpen
              ? "bg-[#144A7E] text-white border-[#2A6EB0]"
              : "bg-[#0A223E] border-[#184576] text-blue-200 hover:text-[#F5B544] hover:border-[#F5B544]/60"
          )}
          title="Open behind-the-scenes AI evidence and analysis"
        >
          <span>Details</span>
          <ChevronRight
            className={cn("w-3.5 h-3.5 transition-transform duration-200", isDetailsOpen && "rotate-90 text-[#F5B544]")}
          />
        </Button>
      </div>

      {/* ── Advocate Action Bar ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#051428] border border-[#133154] px-3 py-2 rounded-xl">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Edit Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleFocusEdit}
            className="h-7 text-xs text-slate-200 hover:text-white hover:bg-slate-800/80 gap-1.5 px-2.5 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-blue-400" />
            <span>Edit</span>
          </Button>

          {/* Save Button */}
          <Button
            type="button"
            size="sm"
            onClick={onSaveContent}
            disabled={isSaving}
            className={cn(
              "h-7 text-xs font-semibold gap-1.5 px-3 cursor-pointer shadow-sm transition-all",
              isDirty
                ? "bg-[#F5B544] hover:bg-[#F5B544]/90 text-slate-950 font-bold"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
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
            className="h-7 text-xs text-slate-200 hover:text-white hover:bg-slate-800/80 gap-1.5 px-2.5 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-[#F5B544]" />
            <span>Copy</span>
          </Button>

          {/* Paste / Replace Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenPasteReplace}
            className="h-7 text-xs border-[#194678] bg-[#071E3C] text-blue-200 hover:text-white hover:border-blue-400 gap-1.5 px-2.5 cursor-pointer font-medium"
            title="Paste in a rewritten statement from external LLMs without erasing evidence"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-[#F5B544]" />
            <span>Paste / Replace</span>
          </Button>

          {/* Email to Parent Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenEmailToParent}
            className="h-7 text-xs border-blue-600/40 bg-blue-950/40 text-blue-300 hover:text-white hover:bg-blue-900/50 gap-1.5 px-2.5 cursor-pointer font-medium"
            title="Prepare and email this draft directly to the parent for review"
          >
            <Mail className="w-3.5 h-3.5 text-blue-400" />
            <span>Email to Parent</span>
          </Button>
        </div>

        {/* Counter */}
        <div className="text-[11px] text-slate-400 flex items-center gap-2">
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
          className="w-full min-h-[240px] sm:min-h-[280px] bg-[#040F1E] border border-[#153B68] focus:border-[#F5B544]/80 text-slate-100 placeholder:text-slate-500 font-sans text-sm sm:text-base leading-relaxed p-4 sm:p-5 rounded-xl shadow-inner outline-none focus:ring-2 focus:ring-[#F5B544]/20 resize-y"
        />
      </div>
    </div>
  );
}
