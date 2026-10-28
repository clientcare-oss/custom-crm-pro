import { useState } from "react";
import {
  ExternalLink,
  Copy,
  Check,
  Bookmark,
  Share2,
  FileText,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Scale,
  Calendar,
  Building,
  Tag,
  ArrowRight,
  Maximize2,
  X,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";
import type { FederalGuidanceDocumentData } from "../../../../shared/federalGuidanceArchiveData";
import SaveFederalLegalToCaseNoteModal from "./SaveFederalLegalToCaseNoteModal";

interface FederalGuidanceReaderProps {
  document: FederalGuidanceDocumentData | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectProvision?: (provisionId: string) => void;
}

export default function FederalGuidanceReader({
  document,
  isOpen,
  onClose,
  onSelectProvision,
}: FederalGuidanceReaderProps) {
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isCaseNoteOpen, setIsCaseNoteOpen] = useState(false);
  const [viewPdfInline, setViewPdfInline] = useState(false);

  // Bookmark handling
  const [isBookmarked, setIsBookmarked] = useState(() => {
    if (!document || typeof window === "undefined") return false;
    try {
      const saved = localStorage.getItem("waypoint_federal_guidance_bookmarks");
      const list = saved ? JSON.parse(saved) : [];
      return list.includes(document.id);
    } catch {
      return false;
    }
  });

  if (!isOpen || !document) return null;

  const handleToggleBookmark = () => {
    try {
      const saved = localStorage.getItem("waypoint_federal_guidance_bookmarks");
      const list: string[] = saved ? JSON.parse(saved) : [];
      const next = isBookmarked ? list.filter((id) => id !== document.id) : [...list, document.id];
      localStorage.setItem("waypoint_federal_guidance_bookmarks", JSON.stringify(next));
      setIsBookmarked(!isBookmarked);
      toast.success(isBookmarked ? "Removed from bookmarks" : "Guidance saved to bookmarks");
    } catch {
      toast.error("Failed to update bookmark");
    }
  };

  const handleCopyCitation = () => {
    const citation = document.documentNumber
      ? `${document.issuingOffice}, ${document.documentNumber} (${document.dateIssued}), "${document.title}"`
      : `${document.issuingOffice} ${document.documentType} (${document.dateIssued}), "${document.title}"`;
    navigator.clipboard.writeText(citation);
    setCopiedCitation(true);
    toast.success("Official guidance citation copied to clipboard");
    setTimeout(() => setCopiedCitation(false), 2000);
  };

  const handleCopyLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("guidanceId", document.id);
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    toast.success("Direct link to document copied to clipboard");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const isRescinded = document.guidanceStatus === "Withdrawn or Rescinded";
  const isHistorical = document.guidanceStatus === "Historical";

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/75 backdrop-blur-sm transition-opacity">
        <div className="relative w-full max-w-3xl h-full bg-[#05142B] border-l border-[#3A2C18] text-[#FFF4D4] shadow-[-16px_0_40px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden animate-in slide-in-from-right duration-250">
          {/* ── Top Command Bar ── */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#3A2C18] bg-[#020A17]/90 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#05142B] text-[#C5A059] border border-[#3A2C18]">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#C5A059] font-semibold">
                  The Correspondence Archive
                </span>
                <div className="text-xs text-[#C6B697] flex items-center gap-2">
                  <span>{document.issuingOffice}</span>
                  <span>•</span>
                  <span>{document.documentType}</span>
                  <span>•</span>
                  <span>{document.dateIssued}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleBookmark}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  isBookmarked
                    ? "bg-[#C5A059] text-[#07162B] border-[#FFE394]"
                    : "bg-[#05142B] text-[#D8C7A5] border-[#3A2C18] hover:text-[#FFF4D4]"
                }`}
                title={isBookmarked ? "Bookmarked" : "Bookmark Document"}
              >
                <Bookmark className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleCopyCitation}
                className="p-2 rounded-xl bg-[#05142B] text-[#D8C7A5] border border-[#3A2C18] hover:text-[#FFF4D4] transition-colors cursor-pointer"
                title="Copy Citation"
              >
                {copiedCitation ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="p-2 rounded-xl bg-[#05142B] text-[#D8C7A5] border border-[#3A2C18] hover:text-[#FFF4D4] transition-colors cursor-pointer"
                title="Copy Link"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-[#05142B] text-[#D8C7A5] border border-[#3A2C18] hover:text-[#FFF4D4] hover:border-[#C5A059] transition-colors cursor-pointer ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Scrollable Document Body ── */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
            {/* Title & Document Number */}
            <div className="space-y-2">
              {document.documentNumber && (
                <div className="inline-block px-2.5 py-0.5 rounded-md bg-[#020A17] border border-[#3A2C18] text-[11px] font-mono text-[#C5A059] font-bold">
                  {document.documentNumber}
                </div>
              )}
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#FFF4D4] leading-snug">
                {document.title}
              </h2>
            </div>

            {/* ── Mandatory Legal Authority Banner ── */}
            <div
              className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                isRescinded
                  ? "bg-rose-950/40 border-rose-800/80 text-rose-200"
                  : isHistorical
                  ? "bg-amber-950/40 border-amber-800/80 text-amber-200"
                  : "bg-[#020A17] border-[#3A2C18] text-[#C6B697]"
              }`}
            >
              <div className="flex items-center gap-2 font-bold tracking-wide">
                {isRescinded ? (
                  <>
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span className="text-rose-300 uppercase tracking-wider font-mono text-[11px]">
                      Historical Document — Withdrawn or Rescinded
                    </span>
                  </>
                ) : isHistorical ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-300 uppercase tracking-wider font-mono text-[11px]">
                      Historical Guidance Archive Record
                    </span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-[#C5A059]" />
                    <span className="text-[#FFE394] uppercase tracking-wider font-mono text-[11px]">
                      Official Agency Guidance (Current / Verified)
                    </span>
                  </>
                )}
              </div>

              <p className="text-[11px] leading-relaxed">
                {isRescinded
                  ? `Notice: This document was officially withdrawn or rescinded on ${document.rescissionDate || "a prior date"}. It is retained in the Waypoint Knowledge Base for historical and legislative research purposes only.`
                  : "Legal Authority Level: Agency Guidance. This document provides official U.S. Department of Education policy clarification and interpretation. It does not independently create new legal obligations beyond applicable federal statutes and regulations."}
              </p>

              {document.statusNotice && (
                <div className="pt-1 text-[11px] font-semibold text-[#FFF4D4]">
                  Status Note: {document.statusNotice}
                </div>
              )}
            </div>

            {/* ── Metadata Ribbons ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#020A17]/80 border border-[#3A2C18] space-y-0.5">
                <span className="text-[10px] font-mono uppercase text-[#A69371] block">Issuing Office</span>
                <span className="text-xs font-bold text-[#FFF4D4]">{document.issuingOffice}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#020A17]/80 border border-[#3A2C18] space-y-0.5">
                <span className="text-[10px] font-mono uppercase text-[#A69371] block">Date Issued</span>
                <span className="text-xs font-bold text-[#FFF4D4]">{document.dateIssued}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#020A17]/80 border border-[#3A2C18] space-y-0.5">
                <span className="text-[10px] font-mono uppercase text-[#A69371] block">Primary Law</span>
                <span className="text-xs font-bold text-[#FFF4D4]">{document.relatedLaws.join(", ")}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#020A17]/80 border border-[#3A2C18] space-y-0.5">
                <span className="text-[10px] font-mono uppercase text-[#A69371] block">Verified Status</span>
                <span className="text-xs font-bold text-[#C5A059]">{document.guidanceStatus}</span>
              </div>
            </div>

            {/* ── Plain-Language Summary ── */}
            <div className="space-y-2">
              <h3 className="text-xs font-mono uppercase tracking-widest text-[#C5A059] font-bold">
                Plain-Language Legal Summary
              </h3>
              <div className="p-4 rounded-xl bg-[#020A17]/70 border border-[#3A2C18] text-xs sm:text-sm text-[#E2D4B7] leading-relaxed">
                {document.summary}
              </div>
            </div>

            {/* ── Key Points ── */}
            {document.keyPoints && document.keyPoints.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="text-xs font-mono uppercase tracking-widest text-[#C5A059] font-bold">
                  Key Points & Advocate Takeaways
                </h3>
                <div className="space-y-2">
                  {document.keyPoints.map((pt, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 p-3 rounded-xl bg-[#020A17]/50 border border-[#3A2C18]/80 text-xs text-[#D8C7A5] leading-relaxed"
                    >
                      <Check className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Related Legal Citations ── */}
            {document.relatedCitations && document.relatedCitations.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-mono uppercase tracking-widest text-[#C5A059] font-bold">
                  Interpreted Federal Statutes & Regulations
                </h3>
                <div className="flex flex-wrap gap-2">
                  {document.relatedCitations.map((cit, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-1.5 rounded-lg bg-[#020A17] border border-[#3A2C18] text-xs font-mono text-[#FFE394] font-semibold flex items-center gap-1.5"
                    >
                      <Scale className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>{cit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Topics & Taxonomy ── */}
            {document.topics && document.topics.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-mono uppercase tracking-widest text-[#A69371] font-semibold">
                  Advocacy Categories
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {document.topics.map((top, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-full text-[11px] bg-[#05142B] border border-[#3A2C18] text-[#C6B697]"
                    >
                      {top}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Embedded PDF Preview / External Link ── */}
            {document.pdfUrl && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-[#C5A059] font-bold">
                    Official PDF Document
                  </h3>
                  <button
                    type="button"
                    onClick={() => setViewPdfInline(!viewPdfInline)}
                    className="text-xs text-[#C5A059] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    {viewPdfInline ? "Collapse Inline Viewer" : "Expand Inline PDF Viewer"}
                  </button>
                </div>

                {viewPdfInline ? (
                  <div className="w-full h-96 rounded-xl border border-[#3A2C18] overflow-hidden bg-[#020A17]">
                    <iframe
                      src={document.pdfUrl}
                      title={document.title}
                      className="w-full h-full border-0"
                    />
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-[#020A17]/80 border border-[#3A2C18] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 text-xs text-[#D8C7A5]">
                      <FileCheck className="w-4 h-4 text-[#C5A059]" />
                      <span>Official PDF available for direct review and download.</span>
                    </div>
                    <a
                      href={document.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-[#07162B] border border-[#3A2C18] text-xs font-semibold text-[#FFF4D4] hover:border-[#C5A059] flex items-center gap-1.5 shrink-0"
                    >
                      <span>Open PDF</span>
                      <ExternalLink className="w-3 h-3 text-[#C5A059]" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Sticky Action Footer ── */}
          <div className="p-4 sm:p-5 border-t border-[#3A2C18] bg-[#020A17]/95 flex items-center justify-between gap-3 shrink-0 flex-wrap">
            <a
              href={document.officialSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] hover:border-[#C5A059] hover:bg-[#07162B] transition-colors"
            >
              <span>Read on ED / OSEP Repository</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#C5A059]" />
            </a>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsCaseNoteOpen(true)}
                className="h-10 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-[0_2px_10px_rgba(197,160,89,0.3)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>Save to Case Notes</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Case Note Modal */}
      <SaveFederalLegalToCaseNoteModal
        guidance={document}
        isOpen={isCaseNoteOpen}
        onClose={() => setIsCaseNoteOpen(false)}
      />
    </>
  );
}
