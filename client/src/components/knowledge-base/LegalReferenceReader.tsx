import { useState } from "react";
import { toast } from "sonner";
import {
  Scale,
  Copy,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Edit3,
  Calendar,
  Layers,
  HelpCircle,
  Eye,
  Info,
} from "lucide-react";
import type { LegalReference, VerificationStatus } from "../../../../shared/stateEducationLawData";
import SaveToCaseNoteModal from "./SaveToCaseNoteModal";
import LegalReferenceEditorModal from "./LegalReferenceEditorModal";

interface LegalReferenceReaderProps {
  reference: LegalReference | null;
  onBookmarkToggle?: (referenceId: string) => void;
  isBookmarked?: boolean;
  onRefresh?: () => void;
}

export default function LegalReferenceReader({
  reference,
  onBookmarkToggle,
  isBookmarked = false,
  onRefresh,
}: LegalReferenceReaderProps) {
  const [caseNoteModalOpen, setCaseNoteModalOpen] = useState(false);
  const [editorModalOpen, setEditorModalOpen] = useState(false);

  if (!reference) {
    return (
      <div className="h-full min-h-[500px] flex flex-col items-center justify-center p-8 rounded-2xl border border-[#3A2C18] bg-[#05142B]/80 text-center space-y-4">
        <div className="p-4 rounded-2xl bg-[#020A17] text-[#C5A059] border border-[#3A2C18] shadow-[0_4px_16px_rgba(0,0,0,0.7)]">
          <Scale className="w-8 h-8 opacity-80" />
        </div>
        <div className="max-w-md space-y-1.5">
          <h3 className="text-lg font-serif font-bold text-[#FFF4D4]">
            Select a Statutory Authority
          </h3>
          <p className="text-xs text-[#C6B697] leading-relaxed">
            Choose any state regulation, administrative code section, or federal mandate from the index to read the authoritative legal summary and citations.
          </p>
        </div>
      </div>
    );
  }

  const handleCopyCitation = () => {
    const textToCopy = `${reference.citation} — ${reference.title} (${reference.state})\nOfficial Link: ${reference.officialUrl || "N/A"}`;
    navigator.clipboard.writeText(textToCopy);
    toast.success("Citation and official reference copied to clipboard");
  };

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case "Verified":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Verified Official Authority
          </span>
        );
      case "Review Needed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-950/70 text-amber-300 border border-amber-500/40">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Review Needed (Possible Change)
          </span>
        );
      case "Source Unavailable":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-950/70 text-rose-300 border border-rose-500/40">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            Source URL Unavailable
          </span>
        );
      case "Unverified":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#102B4E]/60 text-[#D8C7A5] border border-[#3A2C18]">
            <HelpCircle className="w-3.5 h-3.5 text-[#C5A059]" />
            Unverified Basemark
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/95 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] overflow-hidden flex flex-col h-full">
      {/* ── Top Header / Identification Bar ── */}
      <div className="p-5 sm:p-6 border-b border-[#3A2C18]/80 bg-[#020A17]/60 space-y-4">
        {/* Jurisdiction & Badges */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[#C5A059]/20 text-[#FFE394] border border-[#C5A059]/40">
              {reference.state} · {reference.stateName || reference.state}
            </span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#102B4E]/40 text-[#D8C7A5] border border-[#3A2C18]">
              {reference.category}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono text-[#A69371] border border-[#3A2C18]/60">
              {reference.sourceType}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {getStatusBadge(reference.verificationStatus)}
            {reference.isParentVisible && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#C5A059]/15 text-[#FFE394] border border-[#C5A059]/30">
                <Eye className="w-3 h-3" />
                Parent Portal Active
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-serif text-[#FFF4D4] font-semibold tracking-tight leading-snug">
            {reference.title}
          </h2>
        </div>

        {/* Monospace Exact Legal Citation Box */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#020A17] border border-[#3A2C18] shadow-inner">
          <div className="flex items-center gap-2.5 min-w-0">
            <Scale className="w-4 h-4 text-[#C5A059] shrink-0" />
            <span className="font-mono text-xs sm:text-sm font-bold text-[#FFE394] truncate">
              {reference.citation}
            </span>
          </div>

          <button
            onClick={handleCopyCitation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#102B4E]/50 text-[#FFF4D4] hover:bg-[#C5A059] hover:text-[#07162B] transition-all cursor-pointer shrink-0 border border-[#3A2C18]"
            title="Copy exact citation and title to clipboard"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Copy Citation</span>
          </button>
        </div>

        {/* Quick Action Ribbon */}
        <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Open Official Source */}
            {reference.officialUrl ? (
              <a
                href={reference.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-8 px-3.5 rounded-lg text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-[0_2px_8px_rgba(197,160,89,0.3)] hover:brightness-110 transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#07162B]" />
                <span>Open Official Government Law</span>
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs text-[#A69371] italic">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Direct link under state archive review
              </span>
            )}

            {/* Bookmark Reference */}
            {onBookmarkToggle && (
              <button
                type="button"
                onClick={() => onBookmarkToggle(reference.id)}
                className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  isBookmarked
                    ? "bg-[#C5A059]/20 border-[#C5A059] text-[#FFE394]"
                    : "bg-[#020A17] border-[#3A2C18] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4]"
                }`}
              >
                {isBookmarked ? (
                  <>
                    <BookmarkCheck className="w-3.5 h-3.5 text-[#FFE394]" />
                    <span>Bookmarked</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-3.5 h-3.5 text-[#C6B697]" />
                    <span>Bookmark Reference</span>
                  </>
                )}
              </button>
            )}

            {/* Save to Case Notes */}
            <button
              type="button"
              onClick={() => setCaseNoteModalOpen(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-[#020A17] border border-[#3A2C18] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Save to Case Notes</span>
            </button>
          </div>

          {/* Admin Edit Trigger */}
          <button
            type="button"
            onClick={() => setEditorModalOpen(true)}
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-medium text-[#C6B697] hover:text-[#FFE394] hover:bg-[#020A17] transition-all cursor-pointer ml-auto border border-transparent hover:border-[#3A2C18]"
            title="Edit legal reference or update verification status"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Admin Edit</span>
          </button>
        </div>
      </div>

      {/* ── Focused Reading Body ── */}
      <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
        {/* Statutory Timeline Callout */}
        {reference.statutoryTimeline && (
          <div className="rounded-xl border border-[#C5A059]/40 bg-[#102B4E]/30 p-4 flex items-start gap-3 shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
            <div className="p-2 rounded-lg bg-[#020A17] text-[#FFE394] border border-[#3A2C18] shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#C5A059] font-bold">
                Mandatory Statutory Timeline
              </div>
              <div className="text-sm font-semibold text-[#FFF4D4] mt-0.5">
                {reference.statutoryTimeline}
              </div>
            </div>
          </div>
        )}

        {/* Section: Plain-Language Legal Summary */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C5A059] font-serif">
            <Sparkles className="w-4 h-4" />
            <span>Plain-Language Legal Explanation</span>
          </div>
          <div className="p-4 rounded-xl border border-[#3A2C18] bg-[#020A17]/80 text-[#FFF4D4] text-sm leading-relaxed whitespace-pre-wrap font-sans">
            {reference.plainLanguageExplanation}
          </div>
        </div>

        {/* Section: Important Exceptions or Limitations */}
        {reference.exceptions && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 font-serif">
              <AlertTriangle className="w-4 h-4" />
              <span>Important Exceptions & Limitations</span>
            </div>
            <div className="p-4 rounded-xl border border-amber-900/40 bg-amber-950/20 text-[#FFE394] text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
              {reference.exceptions}
            </div>
          </div>
        )}

        {/* Section: Advocate Practice Notes */}
        {reference.advocateNotes && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#FFE394] font-serif">
              <Info className="w-4 h-4 text-[#C5A059]" />
              <span>Advocate Practice Tips & Context</span>
            </div>
            <div className="p-4 rounded-xl border border-[#3A2C18] bg-[#07162B] text-[#D8C7A5] text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
              {reference.advocateNotes}
            </div>
          </div>
        )}

        {/* Section: Related Citations & Cross-References */}
        {reference.relatedCitations && reference.relatedCitations.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C5A059] font-serif">
              <Layers className="w-4 h-4" />
              <span>Related Federal & State Authorities</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {reference.relatedCitations.map((rel, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono bg-[#020A17] border border-[#3A2C18] text-[#FFE394]"
                >
                  {rel}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Section: Source Governance & Verification Meta */}
        <div className="pt-4 border-t border-[#3A2C18]/60 text-xs text-[#A69371] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#C5A059]" />
              Last Verified: {reference.lastVerifiedDate || "Current Academic Year"}
            </span>
            {reference.effectiveDate && (
              <span>· Effective: {reference.effectiveDate}</span>
            )}
          </div>
        </div>
      </div>

      {/* Save to Case Note Modal */}
      <SaveToCaseNoteModal
        reference={reference}
        isOpen={caseNoteModalOpen}
        onClose={() => setCaseNoteModalOpen(false)}
      />

      {/* Admin Editor Modal */}
      <LegalReferenceEditorModal
        reference={reference}
        defaultStateCode={reference.state}
        isOpen={editorModalOpen}
        onClose={() => setEditorModalOpen(false)}
        onSaved={onRefresh}
      />
    </div>
  );
}
