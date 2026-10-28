import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Search,
  Filter,
  FileText,
  Calendar,
  Building,
  Bookmark,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Scale,
  X,
  Plus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { FederalGuidanceDocumentData } from "../../../../shared/federalGuidanceArchiveData";
import FederalGuidanceReader from "./FederalGuidanceReader";

interface FederalGuidanceArchiveProps {
  initialSearch?: string;
  initialTopic?: string;
  onSelectProvision?: (provisionId: string) => void;
}

export default function FederalGuidanceArchive({
  initialSearch = "",
  initialTopic = "All",
  onSelectProvision,
}: FederalGuidanceArchiveProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedOffice, setSelectedOffice] = useState("All");
  const [selectedDocType, setSelectedDocType] = useState("All");
  const [selectedTopic, setSelectedTopic] = useState(initialTopic);
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [activeDocument, setActiveDocument] = useState<FederalGuidanceDocumentData | null>(null);

  // Fetch filter options and live document counts
  const { data: filterOptions } = trpc.federalLaw.getFilterOptions.useQuery();

  // Fetch filtered guidance documents
  const { data: documents = [], isLoading } = trpc.federalLaw.listGuidance.useQuery({
    issuingOffice: selectedOffice === "All" ? undefined : selectedOffice,
    documentType: selectedDocType === "All" ? undefined : selectedDocType,
    topic: selectedTopic === "All" ? undefined : selectedTopic,
    guidanceStatus: selectedStatus === "All" ? undefined : selectedStatus,
    year: selectedYear,
    search: searchQuery.trim() || undefined,
  });

  // Local storage bookmarks
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("waypoint_federal_guidance_bookmarks");
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const filteredDocuments = useMemo(() => {
    if (!showBookmarksOnly) return documents;
    return documents.filter((d) => bookmarks.includes(d.id));
  }, [documents, showBookmarksOnly, bookmarks]);

  const handleToggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const exists = bookmarks.includes(id);
    const next = exists ? bookmarks.filter((bId) => bId !== id) : [...bookmarks, id];
    setBookmarks(next);
    try {
      localStorage.setItem("waypoint_federal_guidance_bookmarks", JSON.stringify(next));
      toast.success(exists ? "Removed from bookmarks" : "Guidance saved to bookmarks");
    } catch {}
  };

  const hasActiveFilters =
    selectedOffice !== "All" ||
    selectedDocType !== "All" ||
    selectedTopic !== "All" ||
    selectedStatus !== "All" ||
    selectedYear !== undefined ||
    showBookmarksOnly ||
    searchQuery.trim().length > 0;

  const handleClearFilters = () => {
    setSelectedOffice("All");
    setSelectedDocType("All");
    setSelectedTopic("All");
    setSelectedStatus("All");
    setSelectedYear(undefined);
    setShowBookmarksOnly(false);
    setSearchQuery("");
  };

  return (
    <div className="w-full space-y-6">
      {/* ── Section Header ── */}
      <div className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/95 p-5 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-serif text-[#FFF4D4] font-normal tracking-wide flex items-center gap-2">
                <span>📑 Federal Guidance Archive</span>
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#C5A059]/20 text-[#FFE394] border border-[#C5A059]/40">
                The Correspondence Archive
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#C6B697] max-w-3xl leading-relaxed">
              Official U.S. Department of Education policy letters, Dear Colleague Letters, OSEP memoranda, and OCR resource guides. Agency guidance clarifies enforcement standards and statutory intent without independently creating new legal obligations.
            </p>
          </div>

          {/* Action Ribbon: Bookmarks */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
              className={`h-9 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                showBookmarksOnly
                  ? "bg-[#C5A059] text-[#07162B] border-[#FFE394] font-bold"
                  : "bg-[#020A17] text-[#D8C7A5] border-[#3A2C18] hover:bg-[#07162B] hover:text-[#FFF4D4]"
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Bookmarked ({bookmarks.length})</span>
            </button>
          </div>
        </div>

        {/* ── Search Bar ── */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C5A059]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Search guidance by title, policy letter number, topic, or keyword (e.g., "behavioral supports", "dyslexia", "Letter to Zirkel", "restraint")...'
            className="h-11 pl-10 pr-24 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] placeholder-[#A69371] text-xs sm:text-sm rounded-xl focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#A69371] hover:text-[#FFF4D4]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── Multi-Dimensional Filters ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
          {/* Issuing Office */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-[#A69371]">
              Issuing Office
            </label>
            <select
              value={selectedOffice}
              onChange={(e) => setSelectedOffice(e.target.value)}
              className="w-full h-8 px-2.5 bg-[#020A17] border border-[#3A2C18] text-xs text-[#FFF4D4] rounded-lg focus:border-[#C5A059]"
            >
              <option value="All">All Offices (OSEP, OCR, OSERS)</option>
              {filterOptions?.offices.map((off) => (
                <option key={off} value={off}>
                  {off}
                </option>
              ))}
            </select>
          </div>

          {/* Document Type */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-[#A69371]">
              Document Type
            </label>
            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              className="w-full h-8 px-2.5 bg-[#020A17] border border-[#3A2C18] text-xs text-[#FFF4D4] rounded-lg focus:border-[#C5A059]"
            >
              <option value="All">All Document Types</option>
              {filterOptions?.docTypes.map((dt) => (
                <option key={dt} value={dt}>
                  {dt}
                </option>
              ))}
            </select>
          </div>

          {/* Advocacy Topic */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-[#A69371]">
              Advocacy Topic
            </label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full h-8 px-2.5 bg-[#020A17] border border-[#3A2C18] text-xs text-[#FFF4D4] rounded-lg focus:border-[#C5A059]"
            >
              <option value="All">All Topics ({filterOptions?.topics.length || 0})</option>
              {filterOptions?.topics.map((top) => (
                <option key={top} value={top}>
                  {top}
                </option>
              ))}
            </select>
          </div>

          {/* Publication Year */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-[#A69371]">
              Publication Year
            </label>
            <select
              value={selectedYear !== undefined ? String(selectedYear) : "All"}
              onChange={(e) => setSelectedYear(e.target.value === "All" ? undefined : Number(e.target.value))}
              className="w-full h-8 px-2.5 bg-[#020A17] border border-[#3A2C18] text-xs text-[#FFF4D4] rounded-lg focus:border-[#C5A059]"
            >
              <option value="All">All Years</option>
              {filterOptions?.years.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-[#A69371]">
              Guidance Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full h-8 px-2.5 bg-[#020A17] border border-[#3A2C18] text-xs text-[#FFF4D4] rounded-lg focus:border-[#C5A059]"
            >
              <option value="All">All Statuses</option>
              {filterOptions?.statuses.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filter Clear Ribbon */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-[#3A2C18]/60 text-[#C6B697]">
            <div className="flex items-center gap-2 flex-wrap">
              <span>Showing {filteredDocuments.length} matching guidance records</span>
            </div>
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-[#C5A059] hover:underline cursor-pointer flex items-center gap-1 font-semibold"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Document Correspondence Cards ── */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-[#C6B697] rounded-2xl border border-[#3A2C18] bg-[#05142B]/90">
          Loading Federal Guidance Archive...
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="p-12 text-center space-y-3 rounded-2xl border border-[#3A2C18] bg-[#05142B]/90">
          <FileText className="w-10 h-10 text-[#C5A059]/40 mx-auto" />
          <div className="text-sm font-serif text-[#FFF4D4] font-bold">No Federal Guidance Documents Found</div>
          <p className="text-xs text-[#C6B697] max-w-md mx-auto">
            No official guidance matches your current filter criteria. Try clearing search terms or selecting &quot;All&quot; topics.
          </p>
          <Button
            variant="outline"
            onClick={handleClearFilters}
            className="text-xs border-[#3A2C18] text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#07162B]"
          >
            Clear Active Filters
          </Button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredDocuments.map((doc) => {
            const isBookmarked = bookmarks.includes(doc.id);
            const isRescinded = doc.guidanceStatus === "Withdrawn or Rescinded";
            const isHistorical = doc.guidanceStatus === "Historical";

            return (
              <div
                key={doc.id}
                onClick={() => setActiveDocument(doc)}
                className="group cursor-pointer relative rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 hover:border-[#C5A059]/80 p-5 sm:p-6 transition-all duration-200 shadow-[0_6px_20px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:shadow-[0_8px_30px_rgba(197,160,89,0.2)] space-y-3.5"
              >
                {/* Header Metadata Ribbon */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#020A17] border border-[#3A2C18] text-[11px] font-mono font-bold text-[#FFE394]">
                      {doc.issuingOffice}
                    </span>

                    {doc.documentNumber && (
                      <span className="px-2 py-0.5 rounded-md bg-[#07162B] border border-[#3A2C18] text-[11px] font-mono text-[#C5A059]">
                        {doc.documentNumber}
                      </span>
                    )}

                    <span className="text-xs text-[#A69371]">{doc.documentType}</span>
                    <span className="text-xs text-[#A69371]">•</span>
                    <span className="text-xs text-[#A69371]">{doc.dateIssued}</span>
                  </div>

                  {/* Status Indicator Pill */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 ${
                        isRescinded
                          ? "bg-rose-950/60 text-rose-300 border border-rose-800"
                          : isHistorical
                          ? "bg-amber-950/60 text-amber-300 border border-amber-800"
                          : "bg-emerald-950/60 text-emerald-300 border border-emerald-800"
                      }`}
                    >
                      {isRescinded ? (
                        <>
                          <ShieldAlert className="w-3 h-3" />
                          <span>Withdrawn / Rescinded</span>
                        </>
                      ) : isHistorical ? (
                        <>
                          <AlertTriangle className="w-3 h-3" />
                          <span>Historical</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3 h-3" />
                          <span>Current / Verified</span>
                        </>
                      )}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => handleToggleBookmark(doc.id, e)}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        isBookmarked
                          ? "bg-[#C5A059] text-[#07162B] border-[#FFE394]"
                          : "bg-[#020A17] text-[#A69371] border-[#3A2C18] hover:text-[#FFF4D4]"
                      }`}
                      title={isBookmarked ? "Bookmarked" : "Bookmark Document"}
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <h3 className="text-base sm:text-lg font-serif font-bold text-[#FFF4D4] group-hover:text-[#FFE394] transition-colors leading-snug">
                    {doc.title}
                  </h3>
                </div>

                {/* Summary */}
                <p className="text-xs sm:text-sm text-[#C6B697] leading-relaxed line-clamp-2">
                  {doc.summary}
                </p>

                {/* Footer Citations and Read trigger */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#3A2C18]/60 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono text-[#A69371] uppercase">Interprets:</span>
                    {doc.relatedCitations.map((cit, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-[#020A17] border border-[#3A2C18] text-[11px] font-mono text-[#FFE394]"
                      >
                        {cit}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 text-[#C5A059] font-bold group-hover:translate-x-0.5 transition-transform shrink-0">
                    <span>Open Reading Environment</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Focused Document Reader Modal ── */}
      <FederalGuidanceReader
        document={activeDocument}
        isOpen={!!activeDocument}
        onClose={() => setActiveDocument(null)}
        onSelectProvision={onSelectProvision}
      />
    </div>
  );
}
