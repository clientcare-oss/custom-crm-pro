import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Scale,
  Search,
  BookOpen,
  Bookmark,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Plus,
  Compass,
  GraduationCap,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ALL_STATE_JURISDICTIONS,
  REQUIRED_LEGAL_CATEGORIES,
  type StateJurisdiction,
  type VerificationStatus,
  type LegalSourceType,
} from "../../../../shared/stateEducationLawData";
import LegalReferenceReader from "./LegalReferenceReader";
import LegalReferenceEditorModal from "./LegalReferenceEditorModal";
import PageIdBadge from "@/components/PageIdBadge";

interface StateLawLibraryProps {
  initialStateCode?: string;
  initialCategory?: string;
}

const POPULAR_STATES = [
  { code: "US", label: "Federal Law (IDEA / 504 / ADA)" },
  { code: "GA", label: "Georgia (Home Practice)" },
  { code: "TX", label: "Texas" },
  { code: "CA", label: "California" },
  { code: "FL", label: "Florida" },
  { code: "NY", label: "New York" },
  { code: "NC", label: "North Carolina" },
];

export default function StateLawLibrary({
  initialStateCode,
  initialCategory,
}: StateLawLibraryProps) {
  // Sync state from query params or props
  const [selectedState, setSelectedState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      return url.searchParams.get("state") || initialStateCode || "GA";
    }
    return initialStateCode || "GA";
  });

  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      return url.searchParams.get("category") || initialCategory || "All";
    }
    return initialCategory || "All";
  });

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedSourceType, setSelectedSourceType] = useState<string>("All");
  const [showBookmarksOnly, setShowBookmarksOnly] = useState<boolean>(false);
  const [selectedLetter, setSelectedLetter] = useState<string>("All");
  const [activeReferenceId, setActiveReferenceId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);

  // Local storage for bookmarked references
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("waypoint_legal_bookmarks");
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const handleToggleBookmark = (refId: string) => {
    setBookmarks((prev) => {
      const exists = prev.includes(refId);
      const next = exists ? prev.filter((id) => id !== refId) : [...prev, refId];
      try {
        localStorage.setItem("waypoint_legal_bookmarks", JSON.stringify(next));
      } catch {}
      toast.success(exists ? "Removed from bookmarked laws" : "Reference saved to personal bookmarks");
      return next;
    });
  };

  // Fetch verified references from server
  const {
    data: references = [],
    isLoading,
    refetch,
  } = trpc.stateLaw.list.useQuery({
    state: selectedState === "ALL_STATES" ? undefined : selectedState,
    category: selectedCategory === "All" ? undefined : selectedCategory,
    search: searchQuery || undefined,
    verificationStatus:
      selectedStatus === "All" ? undefined : (selectedStatus as VerificationStatus),
    sourceType:
      selectedSourceType === "All" ? undefined : (selectedSourceType as LegalSourceType),
  });

  // Fetch states directory with metadata
  const { data: serverStates = [] } = trpc.stateLaw.getStates.useQuery();

  // Combine state data
  const statesList: StateJurisdiction[] = useMemo(() => {
    return ALL_STATE_JURISDICTIONS.map((st) => {
      const matched = serverStates.find((s) => s.code === st.code);
      return {
        ...st,
        evaluationTimeline: matched?.evaluationTimeline || st.evaluationTimeline,
        transitionAge: matched?.transitionAge || st.transitionAge,
        complaintTimeline: matched?.complaintTimeline || st.complaintTimeline,
      };
    });
  }, [serverStates]);

  const currentJurisdiction = useMemo(() => {
    return statesList.find((s) => s.code === selectedState) || statesList[0];
  }, [statesList, selectedState]);

  // Filter references by bookmarks if toggled
  const filteredReferences = useMemo(() => {
    if (!showBookmarksOnly) return references;
    return references.filter((r) => bookmarks.includes(r.id));
  }, [references, showBookmarksOnly, bookmarks]);

  // Currently viewed reference
  const currentReference = useMemo(() => {
    if (activeReferenceId) {
      const found = filteredReferences.find((r) => r.id === activeReferenceId);
      if (found) return found;
    }
    return filteredReferences[0] || null;
  }, [filteredReferences, activeReferenceId]);

  // Update URL parameters when selection changes
  const handleSelectState = (code: string) => {
    setSelectedState(code);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("state", code);
      window.history.replaceState(null, "", url.toString());
    }
  };

  const handleSelectCategory = (cat: string) => {
    setSelectedCategory(cat);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (cat === "All") {
        url.searchParams.delete("category");
      } else {
        url.searchParams.set("category", cat);
      }
      window.history.replaceState(null, "", url.toString());
    }
  };

  // State letter index list (A-W)
  const letters = useMemo(() => {
    const set = new Set<string>();
    statesList.forEach((st) => {
      if (st.code !== "US" && st.code !== "FED") {
        set.add(st.name.charAt(0).toUpperCase());
      }
    });
    return Array.from(set).sort();
  }, [statesList]);

  // Filtered state grid by letter jump
  const statesByLetter = useMemo(() => {
    if (selectedLetter === "All") return statesList;
    return statesList.filter(
      (st) => st.code === "US" || st.name.toUpperCase().startsWith(selectedLetter)
    );
  }, [statesList, selectedLetter]);

  return (
    <div className="w-full space-y-6">
      {/* ── Section Title & Jurisdiction Command Center ── */}
      <div className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/95 p-5 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl sm:text-2xl font-serif text-[#FFF4D4] font-normal tracking-wide flex items-center gap-2">
                <span>⚖️ State Education Law Library</span>
              </span>
              <PageIdBadge id="PG-016-LAW" name="State Law Library" />
            </div>
            <p className="text-xs sm:text-sm text-[#C6B697] max-w-3xl leading-relaxed">
              Explore education laws, special education regulations, and parent rights across all 50 states, Washington D.C., and Federal statutes.
            </p>
          </div>

          {/* Action Ribbon: Add Reference + Bookmarks */}
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

            <button
              type="button"
              onClick={() => setIsEditorOpen(true)}
              className="h-9 px-4 rounded-xl text-xs font-bold flex items-center gap-2 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-[0_2px_8px_rgba(197,160,89,0.3)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 text-[#07162B]" />
              <span>Catalog Legal Authority</span>
            </button>
          </div>
        </div>

        {/* ── Search Bar Supporting Natural Queries ── */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C5A059]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Search legal authorities (e.g., "Georgia evaluation timeline", "Texas IEP requirements", "34 CFR 300.301")...'
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

        {/* ── Fast Jump Strip for Major Jurisdictions ── */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[#3A2C18]/60">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#C5A059] mr-1">
            Quick Jump:
          </span>
          {POPULAR_STATES.map((pop) => (
            <button
              key={pop.code}
              type="button"
              onClick={() => handleSelectState(pop.code)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedState === pop.code
                  ? "bg-[#C5A059] text-[#07162B] font-bold shadow-[0_2px_8px_rgba(197,160,89,0.4)]"
                  : "bg-[#020A17] text-[#D8C7A5] hover:bg-[#102B4E] hover:text-[#FFF4D4] border border-[#3A2C18]"
              }`}
            >
              {pop.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Active Jurisdiction Dossier Card ── */}
      {currentJurisdiction && (
        <div className="rounded-2xl border border-[#3A2C18] bg-gradient-to-r from-[#05142B] via-[#081B33] to-[#05142B] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-full bg-[#C5A059]/5 blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xl sm:text-2xl font-serif font-bold text-[#FFF4D4]">
                  {currentJurisdiction.name}
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#C5A059]/20 text-[#FFE394] border border-[#C5A059]/40">
                  {currentJurisdiction.code}
                </span>
                <span className="text-xs text-[#C6B697]">
                  {currentJurisdiction.educationAgencyName}
                </span>
              </div>

              {/* Official SEA Portal Link */}
              {currentJurisdiction.specialEdPageUrl && (
                <div className="flex items-center gap-3 text-xs text-[#A69371] pt-0.5">
                  <a
                    href={currentJurisdiction.specialEdPageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[#C5A059] hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Official State Special Education Portal</span>
                  </a>
                  {currentJurisdiction.officialCodeUrl && (
                    <>
                      <span>·</span>
                      <a
                        href={currentJurisdiction.officialCodeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[#D8C7A5] hover:text-[#FFF4D4] hover:underline"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>State Legal Code Repository</span>
                      </a>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Statutory Key Benchmarks Inset */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
              <div className="p-2.5 rounded-xl bg-[#020A17]/80 border border-[#3A2C18] text-center">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#C5A059]">
                  Evaluation Timeline
                </div>
                <div className="text-xs sm:text-sm font-serif font-bold text-[#FFF4D4] mt-0.5 truncate">
                  {currentJurisdiction.evaluationTimeline}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#020A17]/80 border border-[#3A2C18] text-center">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#C5A059]">
                  Transition Plan Age
                </div>
                <div className="text-xs sm:text-sm font-serif font-bold text-[#FFF4D4] mt-0.5 truncate">
                  {currentJurisdiction.transitionAge}
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-[#020A17]/80 border border-[#3A2C18] text-center">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#C5A059]">
                  Complaint Limit
                </div>
                <div className="text-xs sm:text-sm font-serif font-bold text-[#FFF4D4] mt-0.5 truncate">
                  {currentJurisdiction.complaintTimeline}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── State Selector & Indexed Alphabetical Jump Bar ── */}
      <div className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.85)] space-y-3">
        {/* A-Z Letter Quick Switcher */}
        <div className="flex items-center justify-between gap-1 flex-wrap pb-2 border-b border-[#3A2C18]/60">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#C5A059] mr-2">
              Browse 50 States & DC:
            </span>
            <button
              onClick={() => setSelectedLetter("All")}
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold cursor-pointer transition-colors ${
                selectedLetter === "All"
                  ? "bg-[#C5A059] text-[#07162B]"
                  : "text-[#D8C7A5] hover:bg-[#020A17] hover:text-[#FFF4D4]"
              }`}
            >
              All States
            </button>
            {letters.map((lettr) => (
              <button
                key={lettr}
                onClick={() => setSelectedLetter(lettr)}
                className={`w-6 h-6 rounded text-xs font-mono font-bold flex items-center justify-center cursor-pointer transition-colors ${
                  selectedLetter === lettr
                    ? "bg-[#C5A059] text-[#07162B]"
                    : "text-[#D8C7A5] hover:bg-[#020A17] hover:text-[#FFF4D4]"
                }`}
              >
                {lettr}
              </button>
            ))}
          </div>

          <span className="text-xs text-[#A69371] font-mono">
            {statesByLetter.length} Jurisdictions
          </span>
        </div>

        {/* State Grid Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-48 overflow-y-auto pr-1">
          {statesByLetter.map((st) => {
            const isSelected = selectedState === st.code;
            return (
              <button
                key={st.code}
                type="button"
                onClick={() => handleSelectState(st.code)}
                className={`text-left px-2.5 py-1.5 rounded-xl border text-xs transition-all cursor-pointer truncate ${
                  isSelected
                    ? "bg-[#C5A059] border-[#FFE394] text-[#07162B] font-bold shadow-[0_2px_8px_rgba(197,160,89,0.4)]"
                    : "bg-[#020A17]/80 border-[#3A2C18] text-[#D8C7A5] hover:bg-[#102B4E] hover:text-[#FFF4D4]"
                }`}
                title={`${st.name} (${st.code})`}
              >
                <div className="font-mono text-[11px] font-bold">{st.code}</div>
                <div className="text-[11px] truncate">{st.name}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Legal Topic Categories (The 15 Required Categories) ── */}
      <div className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.85)] space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-[#3A2C18]/60">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-[#C5A059]" />
            <span className="text-xs font-serif font-bold uppercase tracking-wider text-[#FFF4D4]">
              Mandatory Legal Topics (15 Categories)
            </span>
          </div>

          {selectedCategory !== "All" && (
            <button
              onClick={() => handleSelectCategory("All")}
              className="text-xs text-[#C5A059] hover:underline"
            >
              Reset to All Topics
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => handleSelectCategory("All")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedCategory === "All"
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-[0_2px_8px_rgba(197,160,89,0.35)]"
                : "bg-[#020A17] text-[#D8C7A5] hover:bg-[#102B4E] hover:text-[#FFF4D4] border border-[#3A2C18]"
            }`}
          >
            All Legal Topics
          </button>

          {REQUIRED_LEGAL_CATEGORIES.map((cat, idx) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectCategory(cat)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-[0_2px_8px_rgba(197,160,89,0.35)]"
                    : "bg-[#020A17] text-[#D8C7A5] hover:bg-[#102B4E] hover:text-[#FFF4D4] border border-[#3A2C18]"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Dual-Pane Legal Research Console ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: List of Authorities (5 cols on large) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Header & Sub-filters */}
          <div className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/95 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.85)] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-serif font-bold text-[#FFF4D4]">
                Legal Authorities ({filteredReferences.length})
              </span>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-[#A69371]">Status:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="h-7 text-[11px] bg-[#020A17] border border-[#3A2C18] text-[#FFE394] rounded-lg px-2"
                >
                  <option value="All">All Verification</option>
                  <option value="Verified">Verified Only</option>
                  <option value="Review Needed">Review Needed</option>
                  <option value="Unverified">Unverified</option>
                  <option value="Source Unavailable">Source Unavailable</option>
                </select>
              </div>
            </div>

            {/* List of references */}
            <div className="space-y-2.5 max-h-[680px] overflow-y-auto pr-1">
              {isLoading ? (
                <div className="p-8 text-center text-xs text-[#A69371] space-y-2">
                  <Compass className="w-6 h-6 animate-spin mx-auto text-[#C5A059]" />
                  <p>Searching state and federal statutory compendium...</p>
                </div>
              ) : filteredReferences.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-[#3A2C18] bg-[#020A17]/60 space-y-2">
                  <BookOpen className="w-6 h-6 mx-auto text-[#A69371]" />
                  <div className="text-xs font-bold text-[#FFF4D4]">
                    No references match your current filter
                  </div>
                  <p className="text-[11px] text-[#A69371]">
                    Try adjusting your search query, switching categories, or cataloging a new citation.
                  </p>
                  <Button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("All");
                      setSelectedStatus("All");
                      setShowBookmarksOnly(false);
                    }}
                    variant="outline"
                    className="h-7 text-xs border-[#3A2C18] text-[#C5A059] bg-[#05142B] mt-1"
                  >
                    Clear All Filters
                  </Button>
                </div>
              ) : (
                filteredReferences.map((ref) => {
                  const isActive = currentReference?.id === ref.id;
                  const isBookmarked = bookmarks.includes(ref.id);

                  return (
                    <div
                      key={ref.id}
                      onClick={() => setActiveReferenceId(ref.id)}
                      className={`group p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                        isActive
                          ? "bg-[#102B4E]/60 border-[#C5A059] shadow-[0_4px_16px_rgba(197,160,89,0.2)]"
                          : "bg-[#020A17]/80 border-[#3A2C18] hover:border-[#C5A059]/60 hover:bg-[#07162B]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs font-bold text-[#C5A059]">
                            {ref.state} · {ref.citation}
                          </span>
                          {ref.verificationStatus === "Verified" ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          )}
                        </div>

                        {isBookmarked && (
                          <Bookmark className="w-3.5 h-3.5 text-[#FFE394] fill-[#FFE394]" />
                        )}
                      </div>

                      <div className="text-xs sm:text-sm font-serif font-bold text-[#FFF4D4] group-hover:text-[#FFE394] transition-colors leading-snug">
                        {ref.title}
                      </div>

                      <p className="text-[11px] text-[#C6B697] line-clamp-2 leading-relaxed font-sans">
                        {ref.plainLanguageExplanation}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-[#A69371] pt-1 border-t border-[#3A2C18]/40">
                        <span className="truncate max-w-[200px]">{ref.category}</span>
                        {ref.statutoryTimeline && (
                          <span className="font-mono text-[#FFE394] truncate">
                            ⏱️ {ref.statutoryTimeline}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Focused Legal Reference Reader (7 cols on large) */}
        <div className="lg:col-span-7">
          <LegalReferenceReader
            reference={currentReference}
            onBookmarkToggle={handleToggleBookmark}
            isBookmarked={currentReference ? bookmarks.includes(currentReference.id) : false}
            onRefresh={refetch}
          />
        </div>
      </div>

      {/* Editor Modal for Adding / Updating Authorities */}
      <LegalReferenceEditorModal
        defaultStateCode={selectedState}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSaved={refetch}
      />
    </div>
  );
}
