import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardPaste, Eye, ArrowRight, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface PcsPasteReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatement: string;
  onReplaceCurrentDraft: (newPastedStatement: string) => void;
}

export function PcsPasteReplaceModal({
  isOpen,
  onClose,
  currentStatement,
  onReplaceCurrentDraft,
}: PcsPasteReplaceModalProps) {
  const [pastedText, setPastedText] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setPastedText(text);
        toast.success("Pasted from clipboard!");
      }
    } catch {
      toast.info("Please press Ctrl+V inside the text box to paste.");
    }
  };

  const handleConfirmReplace = () => {
    const trimmed = pastedText.trim();
    if (!trimmed) {
      toast.error("Please paste in a statement before replacing.");
      return;
    }

    onReplaceCurrentDraft(trimmed);
    setPastedText("");
    setShowPreview(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[85vh] overflow-y-auto bg-[#07182E] border border-[#1A4578] text-slate-100 shadow-2xl p-4 sm:p-5 flex flex-col gap-3">
        <DialogHeader className="space-y-1 pb-2.5 border-b border-[#183E6C] shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ClipboardPaste className="w-4 h-4 text-[#F5B544]" />
            </span>
            <DialogTitle className="text-base font-bold text-white tracking-wide">
              Paste Parent Concern Statement
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-400 leading-normal">
            Paste a rewritten Parent Concern Statement below. You can preview it before replacing the current working statement.
          </DialogDescription>
        </DialogHeader>

        {/* Input Area */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Paste Rewritten Statement (from ChatGPT, Claude, Word, or notes)</span>
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePasteFromClipboard}
              className="h-6 text-[11px] border-slate-700 bg-slate-900/60 text-slate-300 hover:text-white gap-1 px-2 cursor-pointer"
            >
              <ClipboardPaste className="w-3 h-3 text-[#F5B544]" />
              <span>Paste Clipboard</span>
            </Button>
          </div>

          <Textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste your rewritten Parent Concern Statement here. It will replace the current advocate-facing working draft while preserving full version history..."
            className="min-h-[100px] sm:min-h-[120px] max-h-[180px] bg-[#051324] border-[#183D68] text-slate-100 placeholder:text-slate-500 text-xs sm:text-sm font-sans leading-relaxed p-3 rounded-xl focus:ring-2 focus:ring-[#F5B544]/40 resize-y"
          />

          <div className="text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-1">
            <span>
              Words: <strong>{pastedText.trim() ? pastedText.trim().split(/\s+/).length : 0}</strong> • Characters:{" "}
              <strong>{pastedText.length}</strong>
            </span>
            <span className="text-amber-400/90 flex items-center gap-1 text-[10.5px]">
              <AlertCircle className="w-3 h-3 shrink-0" />
              Prior version will be saved in PCS Version History automatically.
            </span>
          </div>
        </div>

        {/* Optional Comparison Preview */}
        {showPreview && (
          <div className="p-3 rounded-xl bg-[#040E1B] border border-[#163860] space-y-2 max-h-[160px] overflow-y-auto">
            <h4 className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider sticky top-0 bg-[#040E1B] py-0.5">
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span>Replacement Preview vs Current Draft</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
                  Current Draft (Will be archived in History)
                </span>
                <p className="text-slate-300 line-clamp-4 whitespace-pre-wrap font-sans text-xs">
                  {currentStatement || "No current draft."}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-800/40">
                <span className="text-[10px] font-bold text-[#F5B544] uppercase tracking-wide block mb-1">
                  New Replacement Statement
                </span>
                <p className="text-blue-100 line-clamp-4 whitespace-pre-wrap font-sans text-xs">
                  {pastedText.trim() || "(Empty — paste text above)"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-[#183E6C] mt-1 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            disabled={!pastedText.trim()}
            className="text-xs text-blue-300 hover:text-white hover:bg-slate-800/60 gap-1.5 cursor-pointer disabled:opacity-40 h-8"
          >
            <Eye className="w-3.5 h-3.5 text-blue-400" />
            <span>{showPreview ? "Hide Preview" : "Preview Replacement"}</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 cursor-pointer h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmReplace}
              disabled={!pastedText.trim()}
              className="text-xs bg-[#F5B544] hover:bg-[#F5B544]/90 text-slate-950 font-bold gap-1.5 shadow-md cursor-pointer disabled:opacity-50 h-8"
            >
              <span>Replace Current Draft</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
