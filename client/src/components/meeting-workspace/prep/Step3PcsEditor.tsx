import React, { useState } from "react";
import { FileText, Sparkles, Check, Save, ArrowRight, Loader2, AlertTriangle, RefreshCw, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ParentIntelConcern } from "../types";

interface Step3PcsEditorProps {
  studentName: string;
  pcsText: string;
  pcsApproved: boolean;
  hasBlueprintGenerated: boolean;
  approvedConcerns: ParentIntelConcern[];
  onSavePcs: (text: string, approved: boolean) => Promise<void>;
  onGenerateDraft: () => Promise<void>;
  isLoading: boolean;
  onNextStep: () => void;
  onPrevStep: () => void;
}

export function Step3PcsEditor({
  studentName,
  pcsText,
  pcsApproved,
  hasBlueprintGenerated,
  approvedConcerns,
  onSavePcs,
  onGenerateDraft,
  isLoading,
  onNextStep,
  onPrevStep,
}: Step3PcsEditorProps) {
  const [content, setContent] = useState(pcsText);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync if prop changes and not dirty
  React.useEffect(() => {
    if (!isDirty) {
      setContent(pcsText);
    }
  }, [pcsText, isDirty]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setIsDirty(true);
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      await onSavePcs(content, false);
      setIsDirty(false);
      toast.success("Parent Concern Statement draft saved.");
    } catch (err: any) {
      toast.error("Failed to save PCS draft: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    setIsSaving(true);
    try {
      await onSavePcs(content, true);
      setIsDirty(false);
      toast.success("Parent Concern Statement approved! Ready for Blueprint.");
    } catch (err: any) {
      toast.error("Failed to approve PCS: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(content);
    toast.success("PCS text copied to clipboard.");
  };

  const keptConcernsCount = approvedConcerns.filter((c) => c.status === "keep").length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Generator Action */}
      <div className="rounded-xl bg-[#05142B]/90 border border-[#3A2C18] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[#DFBE77]">
              <FileText className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-serif font-black text-[#FFF4D4] tracking-wide">
              Step 3 — Parent Concern Statement (PCS)
            </h2>
          </div>
          <p className="text-xs text-[#C6B697] max-w-2xl leading-relaxed">
            Translate approved family concerns ({keptConcernsCount} active) into an authoritative, legally grounded Parent Concern Statement ready for delivery to the school team.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={onGenerateDraft}
            disabled={isLoading || keptConcernsCount === 0}
            className="inline-flex items-center gap-2 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 hover:brightness-105 px-4 py-2 cursor-pointer transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#07162B]" />
                Drafting PCS...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-[#07162B]" />
                {content ? "Regenerate PCS Draft" : "✨ Generate PCS Draft"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Warning if PCS changed after Blueprint generation */}
      {hasBlueprintGenerated && isDirty && (
        <div className="rounded-xl border border-amber-500/40 bg-[#020A17] p-4 flex items-start gap-3 shadow-md">
          <AlertTriangle className="h-5 w-5 text-[#FFE394] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-[#FFE394]">
              Parent Concern Statement modified since Blueprint was generated.
            </p>
            <p className="text-[#C6B697]">
              Your edits are safely preserved. Once approved, you can regenerate or update affected meeting targets without losing manual customizations.
            </p>
          </div>
        </div>
      )}

      {/* Editor Container */}
      <div className="rounded-xl bg-[#05142B]/90 border border-[#3A2C18] p-4 sm:p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.85)]">
        <div className="flex items-center justify-between gap-3 border-b border-[#3A2C18] pb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-serif font-bold text-[#FFF4D4] uppercase tracking-wider">
              Document Editor
            </span>
            {pcsApproved ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 font-mono">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                Approved
              </span>
            ) : (
              <span className="text-[11px] text-[#FFE394] bg-[#020A17] px-2 py-0.5 rounded-lg border border-[#3A2C18] font-mono font-medium">
                Draft / Unapproved
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyText}
              disabled={!content}
              className="text-xs border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] hover:border-[#C5A059]/60 cursor-pointer inline-flex items-center gap-1.5"
            >
              <Copy className="h-3.5 w-3.5 text-[#DFBE77]" />
              Copy Text
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isSaving || !content}
              className="text-xs border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] hover:border-[#C5A059]/60 cursor-pointer inline-flex items-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5 text-[#DFBE77]" />
              Save Draft
            </Button>

            <Button
              size="sm"
              onClick={handleApprove}
              disabled={isSaving || !content}
              className="text-xs bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-105 inline-flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Check className="h-3.5 w-3.5" />
              Approve PCS
            </Button>
          </div>
        </div>

        {/* Textarea */}
        <Textarea
          value={content}
          onChange={handleChange}
          placeholder="Click 'Generate PCS Draft' above or type your Parent Concern Statement directly here..."
          rows={16}
          className="w-full text-xs sm:text-[13px] leading-relaxed bg-[#010812] border-[#3A2C18] text-[#FFF4D4] placeholder:text-[#A69371] font-mono focus:border-[#C5A059]/80 p-4 rounded-xl shadow-inner"
        />

        <div className="flex items-center justify-between text-[11px] text-[#A69371] pt-1">
          <span>{content.length} characters · {content.split(/\s+/).filter(Boolean).length} words</span>
          <span>Approved statement automatically feeds Step 4: IEP Blueprint</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-3 border-t border-[#3A2C18]/80">
        <Button
          variant="ghost"
          onClick={onPrevStep}
          className="text-xs text-[#A69371] hover:text-[#FFF4D4] hover:bg-[#071E3D] cursor-pointer"
        >
          ← Back to 2. Parent Intel
        </Button>

        <Button
          onClick={onNextStep}
          className="inline-flex items-center gap-2 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-105 px-5 py-2 cursor-pointer transition-all"
        >
          <span>Next: 4. IEP Blueprint</span>
          <ArrowRight className="h-3.5 w-3.5 text-[#07162B]" />
        </Button>
      </div>
    </div>
  );
}
