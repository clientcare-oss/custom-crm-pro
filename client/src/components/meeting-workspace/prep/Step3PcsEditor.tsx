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
      <div className="rounded-2xl bg-gradient-to-br from-[#0B3767] via-[#09254D] to-[#071C38] border border-[#144E8A] p-5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
              <FileText className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Step 3 — Parent Concern Statement (PCS)
            </h2>
          </div>
          <p className="text-xs text-blue-200/70 max-w-2xl leading-relaxed">
            Translate approved family concerns ({keptConcernsCount} active) into an authoritative, legally grounded Parent Concern Statement ready for delivery to the school team.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={onGenerateDraft}
            disabled={isLoading || keptConcernsCount === 0}
            className="inline-flex items-center gap-2 text-xs font-bold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg border border-indigo-400/30 px-4 py-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Drafting PCS...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-[#F5B544]" />
                {content ? "Regenerate PCS Draft" : "✨ Generate PCS Draft"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Warning if PCS changed after Blueprint generation */}
      {hasBlueprintGenerated && isDirty && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/40 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-[#F5B544] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-amber-200">
              Parent Concern Statement modified since Blueprint was generated.
            </p>
            <p className="text-amber-300/80">
              Your edits are safely preserved. Once approved, you can regenerate or update affected meeting targets without losing manual customizations.
            </p>
          </div>
        </div>
      )}

      {/* Editor Container */}
      <div className="rounded-2xl bg-[#071A33] border border-[#0F3D70] p-4 sm:p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-[#0F3D70] pb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Document Editor
            </span>
            {pcsApproved ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 border border-emerald-500/60 text-emerald-300">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                Approved
              </span>
            ) : (
              <span className="text-[11px] text-amber-300/80 bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-500/30">
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
              className="text-xs border-[#144A7E] bg-[#092244] text-blue-200 hover:text-white cursor-pointer inline-flex items-center gap-1.5"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy Text
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isSaving || !content}
              className="text-xs border-[#144A7E] bg-[#092244] text-blue-200 hover:text-white cursor-pointer inline-flex items-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              Save Draft
            </Button>

            <Button
              size="sm"
              onClick={handleApprove}
              disabled={isSaving || !content}
              className="text-xs bg-[#F5B544] hover:bg-amber-400 text-slate-950 font-bold inline-flex items-center gap-1.5 shadow-md cursor-pointer"
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
          className="w-full text-xs sm:text-[13px] leading-relaxed bg-[#051426] border-[#0E3560] text-blue-100 placeholder:text-blue-400/40 font-mono focus:border-[#F5B544]/60 p-4 rounded-xl"
        />

        <div className="flex items-center justify-between text-[11px] text-blue-300/60 pt-1">
          <span>{content.length} characters · {content.split(/\s+/).filter(Boolean).length} words</span>
          <span>Approved statement automatically feeds Step 4: IEP Blueprint</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2 border-t border-[#0F3C6D]">
        <Button
          variant="ghost"
          onClick={onPrevStep}
          className="text-xs text-blue-300 hover:text-white"
        >
          ← Back to 2. Parent Intel
        </Button>

        <Button
          onClick={onNextStep}
          className="inline-flex items-center gap-2 text-xs font-bold bg-[#0D4B84] hover:bg-[#145D9F] text-white border border-[#206BBC] px-5 py-2 cursor-pointer shadow-lg"
        >
          <span>Next: 4. IEP Blueprint</span>
          <ArrowRight className="h-3.5 w-3.5 text-[#F5B544]" />
        </Button>
      </div>
    </div>
  );
}
