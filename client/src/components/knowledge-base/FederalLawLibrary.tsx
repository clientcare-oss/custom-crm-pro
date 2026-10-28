import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Scale,
  Search,
  BookOpen,
  Bookmark,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Clock,
  Sparkles,
  FileText,
  Copy,
  Check,
  X,
  Plus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { FederalLegalProvisionData } from "../../../../shared/federalEducationLawData";
import type { FederalGuidanceDocumentData } from "../../../../shared/federalGuidanceArchiveData";
import SaveFederalLegalToCaseNoteModal from "./SaveFederalLegalToCaseNoteModal";
import FederalGuidanceReader from "./FederalGuidanceReader";

interface FederalLawLibraryProps {
  initialSearch?: string;
  initialTopic?: string;
  initialAct?: string;
}

export default function FederalLawLibrary({
  initialSearch = "",
  initialTopic = "All",
  initialAct = "All",
}: FederalLawLibraryProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedAct, setSelectedAct] = useState(initialAct);
  const [selectedTopic, setSelectedTopic] = useState(initialTopic);
  const [selectedAuthorityType, setSelectedAuthorityType] = useState("All");
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [selectedSubpart, setSelectedSubpart] = useState("All");

  // Active provision for save to case note modal
  const [activeProvisionForNote, setActiveProvisionForNote] = useState<FederalLegalProvisionData | null>(null);

  // Active guidance document for reader modal (from related guidance click)
  const [activeGuidanceForReader, setActiveGuidanceForReader] = useState<FederalGuidanceDocumentData | null>(null);

  // Expanded cards
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Copied citations tracker
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch filter options
  const { data: filterOptions } = trpc.federalLaw.getFilterOptions.useQuery();

  // Fetch provisions from server
  const { data: provisions = [], isLoading } = trpc.federalLaw.listProvisions.useQuery({
    act: selectedAct === "All" ? undefined : selectedAct,
    subpart: selectedSubpart === "All" ? undefined : selectedSubpart,
    topic: selectedTopic === "All" ? undefined : selectedTopic,
    authorityType: selectedAuthorityType === "All" ? undefined : selectedAuthorityType,
    search: searchQuery.trim() || undefined,
  });

  // Local storage for bookmarked federal laws
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("waypoint_federal_law_bookmarks");
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const toggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const exists = bookmarks.includes(id);
    const next = exists ? bookmarks.filter((bId) => bId !== id) : [...bookmarks, id];
    setBookmarks(next);
    try {
      localStorage.setItem("waypoint_federal_law_bookmarks", JSON.stringify(next));
      toast.success(exists ? "Removed from bookmarks" : "Provision saved to bookmarks");
    } catch {}
  };

  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyCitation = (provision: FederalLegalProvisionData, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `${provision.sectionCitation}, "${provision.title}" (${provision.act})`;
    navigator.clipboard.writeText(text);
    setCopiedId(provision.id);
    toast.success("Citation copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredProvisions = useMemo(() => {
    if (!showBookmarksOnly) return provisions;
    return provisions.filter((p) => bookmarks.includes(p.id));
  }, [provisions, showBookmarksOnly, bookmarks]);

  // Group provisions by subpart for structured volume browsing
  const groupedBySubpart = useMemo(() => {
    const map = new Map<string, FederalLegalProvisionData[]>();
    filteredProvisions.forEach((prov) => {
      const list = map.get(prov.subpart) || [];
      list.push(prov);
      map.set(prov.subpart, list);
    });
    return Array.from(map.entries());
  }, [filteredProvisions]);

  const hasActiveFilters =
    selectedAct !== "All" ||
    selectedTopic !== "All" ||
    selectedSubpart !== "All" ||
    selectedAuthorityType !== "All" ||
    showBookmarksOnly ||
    searchQuery.trim().length > 0;

  const handleClearFilters = () => {
    setSelectedAct("All");
    setSelectedTopic("All");
    setSelectedSubpart("All");
    setSelectedAuthorityType("All");
    setShowBookmarksOnly(false);
    setSearchQuery("");
  };

  // Helper to open guidance document reader
  const { data: allGuidance = [] } = trpc.federalLaw.listGuidance.useQuery({});

  const handleOpenRelatedGuidance = (guidanceIdOrTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const found = allGuidance.find((g) => g.id === guidanceIdOrTitle || g.title.includes(guidanceIdOrTitle));
    if (found) {
      setActiveGuidanceForReader(found);
    } else {
      toast.info("Opening guidance letter in reader...");
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* ── Section Title & Command Center ── */}
      <div className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/95 p-5 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-serif text-[#FFF4D4] font-normal tracking-wide flex items-center gap-2">
                <span>📜 Federal Education Law Library</span>
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#C5A059]/20 text-[#FFE394] border border-[#C5A059]/40">
                The Federal Reference Collection
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#C6B697] max-w-3xl leading-relaxed">
              Authoritative, indexed federal statutes and binding regulations: IDEA Part B (34 CFR Part 300), Part C (Part 303), Section 504 (34 CFR Part 104), ADA Title II, FERPA, and ESSA. Every provision links to official government repositories.
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
            placeholder='Search federal law by citation, section, or topic (e.g., "34 CFR 300.324", "Child Find", "FAPE", "Independent Educational Evaluation", "MDR")...'
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

        {/* ── Primary Act Switcher (Bound Volume Tabs) ── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
          {[
            { id: "All", label: "All Federal Acts" },
            { id: "IDEA Part B", label: "IDEA Part B (34 CFR Part 300)" },
            { id: "Section 504", label: "Section 504 (34 CFR Part 104)" },
            { id: "ADA Title II", label: "ADA Title II" },
            { id: "FERPA", label: "FERPA (34 CFR Part 99)" },
            { id: "ESSA", label: "ESSA" },
          ].map((act) => (
            <button
              key={act.id}
              type="button"
              onClick={() => setSelectedAct(act.id)}
              className={`h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedAct === act.id
                  ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-[0_2px_8px_rgba(197,160,89,0.3)] border border-[#FFE394]/50"
                  : "bg-[#020A17] text-[#D8C7A5] border border-[#3A2C18] hover:bg-[#07162B] hover:text-[#FFF4D4]"
              }`}
            >
              {act.label}
            </button>
          ))}
        </div>

        {/* ── Subpart & Topic Filters ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
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

          {/* Subpart Index */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-[#A69371]">
              Subpart / Chapter
            </label>
            <select
              value={selectedSubpart}
              onChange={(e) => setSelectedSubpart(e.target.value)}
              className="w-full h-8 px-2.5 bg-[#020A17] border border-[#3A2C18] text-xs text-[#FFF4D4] rounded-lg focus:border-[#C5A059]"
            >
              <option value="All">All Subparts</option>
              {filterOptions?.subparts.map((sp) => (
                <option key={sp} value={sp}>
                  {sp}
                </option>
              ))}
            </select>
          </div>

          {/* Authority Type */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-[#A69371]">
              Authority Type
            </label>
            <select
              value={selectedAuthorityType}
              onChange={(e) => setSelectedAuthorityType(e.target.value)}
              className="w-full h-8 px-2.5 bg-[#020A17] border border-[#3A2C18] text-xs text-[#FFF4D4] rounded-lg focus:border-[#C5A059]"
            >
              <option value="All">All Types (Statute & Regulation)</option>
              <option value="Federal Regulation">Federal Regulation (34 CFR)</option>
              <option value="Statute">Federal Statute (20 U.S.C.)</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Reset */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-[#3A2C18]/60 text-[#C6B697]">
            <span>Showing {filteredProvisions.length} matching federal provisions</span>
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

      {/* ── Provisions List Grouped by Subpart ── */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-[#C6B697] rounded-2xl border border-[#3A2C18] bg-[#05142B]/90">
          Loading Federal Education Law Library...
        </div>
      ) : groupedBySubpart.length === 0 ? (
        <div className="p-12 text-center space-y-3 rounded-2xl border border-[#3A2C18] bg-[#05142B]/90">
          <BookOpen className="w-10 h-10 text-[#C5A059]/40 mx-auto" />
          <div className="text-sm font-serif text-[#FFF4D4] font-bold">No Federal Legal Provisions Found</div>
          <p className="text-xs text-[#C6B697] max-w-md mx-auto">
            No provisions match your search criteria. Try broadening your query or selecting &quot;All Acts&quot;.
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
        <div className="space-y-6">
          {groupedBySubpart.map(([subpartTitle, provList]) => (
            <div key={subpartTitle} className="space-y-3">
              {/* Subpart Section Header */}
              <div className="flex items-center gap-2 px-2">
                <BookOpen className="w-4 h-4 text-[#C5A059]" />
                <h3 className="text-xs sm:text-sm font-serif font-bold text-[#FFE394] tracking-wide uppercase">
                  {subpartTitle}
                </h3>
                <span className="text-[11px] font-mono text-[#A69371]">({provList.length})</span>
                <div className="flex-1 h-[1px] bg-gradient-to-r from-[#3A2C18] to-transparent ml-2" />
              </div>

              {/* Provision Cards */}
              <div className="space-y-3.5">
                {provList.map((provision) => {
                  const isExpanded = !!expandedCards[provision.id];
                  const isBookmarked = bookmarks.includes(provision.id);
                  const isCopied = copiedId === provision.id;

                  return (
                    <div
                      key={provision.id}
                      className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 hover:border-[#C5A059]/80 transition-all duration-200 shadow-[0_6px_20px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.06)] overflow-hidden"
                    >
                      {/* Provision Header Bar */}
                      <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#020A17]/60 border-b border-[#3A2C18]/60">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-md bg-[#07162B] border border-[#3A2C18] text-[11px] font-mono font-bold text-[#FFE394]">
                              {provision.act}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#C5A059]/20 text-[#FFE394] border border-[#C5A059]/40 font-semibold">
                              {provision.authorityType}
                            </span>
                            <span className="text-base sm:text-lg font-mono font-black text-[#FFF4D4] tracking-tight">
                              {provision.sectionCitation}
                            </span>
                          </div>
                          <h4 className="text-base sm:text-lg font-serif font-bold text-[#FFF4D4]">
                            {provision.title}
                          </h4>
                        </div>

                        {/* Top Action Ribbon */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleCopyCitation(provision, e)}
                            className="p-2 rounded-xl bg-[#05142B] text-[#D8C7A5] border border-[#3A2C18] hover:text-[#FFF4D4] transition-colors cursor-pointer"
                            title="Copy Citation"
                          >
                            {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => toggleBookmark(provision.id, e)}
                            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                              isBookmarked
                                ? "bg-[#C5A059] text-[#07162B] border-[#FFE394]"
                                : "bg-[#05142B] text-[#D8C7A5] border-[#3A2C18] hover:text-[#FFF4D4]"
                            }`}
                            title={isBookmarked ? "Bookmarked" : "Bookmark Provision"}
                          >
                            <Bookmark className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleExpand(provision.id)}
                            className="h-8 px-3 rounded-xl bg-[#05142B] border border-[#3A2C18] text-xs font-semibold text-[#D8C7A5] hover:text-[#FFF4D4] hover:border-[#C5A059] flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <span>{isExpanded ? "Collapse" : "Details"}</span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Main Analysis Body */}
                      <div className="p-4 sm:p-5 space-y-4">
                        {/* Plain Language Analysis */}
                        <p className="text-xs sm:text-sm text-[#E2D4B7] leading-relaxed">
                          {provision.plainLanguageExplanation}
                        </p>

                        {/* Statutory Timeline Pill */}
                        {provision.statutoryTimeline && (
                          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#020A17]/80 border border-[#3A2C18] text-xs">
                            <Clock className="w-4 h-4 text-[#C5A059] shrink-0" />
                            <span className="font-mono text-[#A69371] uppercase text-[10px] font-semibold">
                              Statutory Timeline:
                            </span>
                            <span className="font-semibold text-[#FFF4D4]">{provision.statutoryTimeline}</span>
                          </div>
                        )}

                        {/* Expanded Section Details */}
                        {isExpanded && (
                          <div className="space-y-4 pt-2 border-t border-[#3A2C18]/60 animate-in fade-in duration-200">
                            {/* Key Points */}
                            {provision.keyPoints && provision.keyPoints.length > 0 && (
                              <div className="space-y-2">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-[#C5A059] font-bold block">
                                  Mandatory Regulatory Requirements
                                </span>
                                <div className="space-y-1.5">
                                  {provision.keyPoints.map((pt, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-start gap-2 p-2.5 rounded-lg bg-[#020A17]/50 border border-[#3A2C18]/60 text-xs text-[#D8C7A5]"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 text-[#C5A059] shrink-0 mt-0.5" />
                                      <span>{pt}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Advocacy Tips */}
                            {provision.advocacyTips && (
                              <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/50 space-y-1.5">
                                <div className="flex items-center gap-2 text-xs font-bold text-[#FFE394]">
                                  <Sparkles className="w-4 h-4 text-[#C5A059]" />
                                  <span>Advocate Strategy & Practice Insight</span>
                                </div>
                                <p className="text-xs text-[#E2D4B7] leading-relaxed">
                                  {provision.advocacyTips}
                                </p>
                              </div>
                            )}

                            {/* ── MAJOR REQUIREMENT: Related Official Federal Guidance Letters ── */}
                            <div className="space-y-2 pt-1">
                              <span className="text-[10px] font-mono uppercase tracking-widest text-[#C5A059] font-bold block">
                                Related Federal Guidance & Clarifications
                              </span>

                              {allGuidance.filter((g) =>
                                g.relatedCitations.some(
                                  (c) => c.includes(provision.sectionCitation) || provision.sectionCitation.includes(c)
                                )
                              ).length === 0 ? (
                                <div className="p-2.5 rounded-lg bg-[#020A17]/40 border border-[#3A2C18]/40 text-xs text-[#A69371] italic">
                                  No specific Dear Colleague or OSEP Policy Letter currently cataloged for this provision.
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {allGuidance
                                    .filter((g) =>
                                      g.relatedCitations.some(
                                        (c) =>
                                          c.includes(provision.sectionCitation) ||
                                          provision.sectionCitation.includes(c)
                                      )
                                    )
                                    .map((g) => (
                                      <div
                                        key={g.id}
                                        onClick={(e) => handleOpenRelatedGuidance(g.id, e)}
                                        className="p-2.5 rounded-xl bg-[#020A17] border border-[#3A2C18] hover:border-[#C5A059] transition-all cursor-pointer group flex flex-col justify-between"
                                      >
                                        <div className="space-y-1">
                                          <div className="flex items-center justify-between text-[10px] text-[#A69371]">
                                            <span className="font-mono font-bold text-[#C5A059]">
                                              {g.issuingOffice}
                                            </span>
                                            <span>{g.publicationYear}</span>
                                          </div>
                                          <div className="text-xs font-serif font-bold text-[#FFF4D4] group-hover:text-[#FFE394] line-clamp-2">
                                            {g.title}
                                          </div>
                                        </div>
                                        <div className="pt-2 flex items-center justify-between text-[11px] text-[#C5A059] font-semibold">
                                          <span>Open Guidance Letter</span>
                                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Bottom Actions Ribbon */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#3A2C18]/60 text-xs">
                          {/* Topics */}
                          <div className="flex flex-wrap gap-1.5">
                            {provision.topics.map((top, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-full text-[10px] bg-[#020A17] border border-[#3A2C18] text-[#C6B697]"
                              >
                                {top}
                              </span>
                            ))}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setActiveProvisionForNote(provision)}
                              className="h-8 px-3 rounded-lg text-xs font-semibold bg-[#020A17] border border-[#3A2C18] text-[#FFE394] hover:border-[#C5A059] hover:bg-[#07162B] transition-colors cursor-pointer"
                            >
                              Attach to Case
                            </button>

                            <a
                              href={provision.officialUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-8 px-3 rounded-lg text-xs font-semibold bg-[#07162B] border border-[#3A2C18] text-[#FFF4D4] hover:border-[#C5A059] flex items-center gap-1.5 transition-colors"
                            >
                              <span>Official eCFR</span>
                              <ExternalLink className="w-3 h-3 text-[#C5A059]" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save to Case Note Modal */}
      <SaveFederalLegalToCaseNoteModal
        provision={activeProvisionForNote}
        isOpen={!!activeProvisionForNote}
        onClose={() => setActiveProvisionForNote(null)}
      />

      {/* Guidance Reader Modal for attached guidance */}
      <FederalGuidanceReader
        document={activeGuidanceForReader}
        isOpen={!!activeGuidanceForReader}
        onClose={() => setActiveGuidanceForReader(null)}
      />
    </div>
  );
}
