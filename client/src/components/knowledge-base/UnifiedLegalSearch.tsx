import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Search,
  Scale,
  FileText,
  Building,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  X,
  Filter,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { UnifiedSearchResult } from "../../../../server/db/federalLaw";
import FederalGuidanceReader from "./FederalGuidanceReader";
import type { FederalGuidanceDocumentData } from "../../../../shared/federalGuidanceArchiveData";
import SaveFederalLegalToCaseNoteModal from "./SaveFederalLegalToCaseNoteModal";
import type { FederalLegalProvisionData } from "../../../../shared/federalEducationLawData";

const POPULAR_LEGAL_QUERIES = [
  "behavior intervention",
  "dyslexia",
  "evaluation timeline",
  "Prior Written Notice",
  "Independent Educational Evaluation",
  "Manifestation Determination Review",
  "Section 504 accommodations",
  "compensatory education",
  "restraint and seclusion",
];

export default function UnifiedLegalSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "federal_law" | "federal_guidance" | "state_law">("all");
  const [authorityFilter, setAuthorityFilter] = useState<"all" | "binding_only" | "guidance_only">("all");
  const [jurisdictionFilter, setJurisdictionFilter] = useState("all");

  // Modals state
  const [activeGuidance, setActiveGuidance] = useState<FederalGuidanceDocumentData | null>(null);
  const [activeProvision, setActiveProvision] = useState<FederalLegalProvisionData | null>(null);

  // Unified search query
  const { data: results = [], isLoading } = trpc.federalLaw.unifiedSearch.useQuery(
    {
      query: searchQuery.trim(),
      categoryFilter,
      authorityFilter,
      jurisdictionFilter,
      limit: 60,
    },
    {
      enabled: searchQuery.trim().length > 0,
    }
  );

  // Fetch full datasets for modal popups
  const { data: allGuidance = [] } = trpc.federalLaw.listGuidance.useQuery({});
  const { data: allProvisions = [] } = trpc.federalLaw.listProvisions.useQuery({});

  const handleOpenResult = (item: UnifiedSearchResult) => {
    if (item.sourceCategory === "federal_guidance") {
      const doc = allGuidance.find((g) => g.id === item.id);
      if (doc) setActiveGuidance(doc);
    } else if (item.sourceCategory === "federal_law") {
      const prov = allProvisions.find((p) => p.id === item.id);
      if (prov) setActiveProvision(prov);
    } else {
      window.open(item.officialUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* ── Search Header Command Center ── */}
      <div className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/95 p-5 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-serif text-[#FFF4D4] font-normal tracking-wide flex items-center gap-2">
              <span>🔍 Unified Legal Search</span>
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#C5A059]/20 text-[#FFE394] border border-[#C5A059]/40">
              Cross-Jurisdiction Legal Intelligence
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#C6B697] max-w-3xl leading-relaxed">
            Search across State Education Law (all 50 states), Federal Statutes & Regulations (IDEA, 504, ADA), and official Federal Agency Guidance (Dear Colleague & OSEP Policy Letters) simultaneously.
          </p>
        </div>

        {/* ── Search Input ── */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C5A059]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Search across all legal collections (e.g., "behavior intervention", "dyslexia", "evaluation timeline", "34 CFR 300.324")...'
            className="h-12 pl-10 pr-24 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] placeholder-[#A69371] text-xs sm:text-sm rounded-xl focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]"
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

        {/* ── Quick Search Suggestion Pills ── */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[10px] font-mono text-[#A69371] uppercase mr-1">Suggested:</span>
          {POPULAR_LEGAL_QUERIES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setSearchQuery(q)}
              className="px-2.5 py-0.5 rounded-full text-[11px] bg-[#020A17] border border-[#3A2C18] text-[#D8C7A5] hover:border-[#C5A059] hover:text-[#FFF4D4] transition-colors cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>

        {/* ── Filter Controls ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[#3A2C18]/60">
          {/* Source Category */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-[#A69371]">
              Legal Collection
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="w-full h-8 px-2.5 bg-[#020A17] border border-[#3A2C18] text-xs text-[#FFF4D4] rounded-lg focus:border-[#C5A059]"
            >
              <option value="all">All Three Collections</option>
              <option value="federal_law">Federal Education Law Only (IDEA, 504, ADA)</option>
              <option value="federal_guidance">Federal Guidance Archive Only (DCLs, OSEP)</option>
              <option value="state_law">State Education Law Only (50 States)</option>
            </select>
          </div>

          {/* Authority Level */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-[#A69371]">
              Legal Authority Level
            </label>
            <select
              value={authorityFilter}
              onChange={(e) => setAuthorityFilter(e.target.value as any)}
              className="w-full h-8 px-2.5 bg-[#020A17] border border-[#3A2C18] text-xs text-[#FFF4D4] rounded-lg focus:border-[#C5A059]"
            >
              <option value="all">All Authority Levels</option>
              <option value="binding_only">Binding Law Only (Statutes & Regulations)</option>
              <option value="guidance_only">Agency Guidance Only (Policy Interpretations)</option>
            </select>
          </div>

          {/* Jurisdiction */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-[#A69371]">
              Jurisdiction Filter
            </label>
            <select
              value={jurisdictionFilter}
              onChange={(e) => setJurisdictionFilter(e.target.value)}
              className="w-full h-8 px-2.5 bg-[#020A17] border border-[#3A2C18] text-xs text-[#FFF4D4] rounded-lg focus:border-[#C5A059]"
            >
              <option value="all">All Jurisdictions (US + 50 States)</option>
              <option value="US">Federal Law / US Government</option>
              <option value="GA">Georgia (GaDOE)</option>
              <option value="TX">Texas (TEA)</option>
              <option value="CA">California (CDE)</option>
              <option value="FL">Florida (FDOE)</option>
              <option value="NY">New York (NYSED)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Search Results List ── */}
      {!searchQuery.trim() ? (
        <div className="p-12 text-center space-y-3 rounded-2xl border border-[#3A2C18] bg-[#05142B]/90">
          <Search className="w-10 h-10 text-[#C5A059]/40 mx-auto" />
          <div className="text-sm font-serif text-[#FFF4D4] font-bold">
            Enter a Search Query Above
          </div>
          <p className="text-xs text-[#C6B697] max-w-md mx-auto">
            Search terms, legal citations, or topics to query State Law, Federal Statutes, and Official Agency Guidance simultaneously.
          </p>
        </div>
      ) : isLoading ? (
        <div className="p-12 text-center text-xs text-[#C6B697] rounded-2xl border border-[#3A2C18] bg-[#05142B]/90">
          Searching across State Law, Federal Statutes, and Federal Guidance Archive...
        </div>
      ) : results.length === 0 ? (
        <div className="p-12 text-center space-y-3 rounded-2xl border border-[#3A2C18] bg-[#05142B]/90">
          <div className="text-sm font-serif text-[#FFF4D4] font-bold">No Matching Authorities Found</div>
          <p className="text-xs text-[#C6B697] max-w-md mx-auto">
            No authorities matched &quot;{searchQuery}&quot; under the active filter criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          <div className="text-xs text-[#C6B697] px-2 flex items-center justify-between">
            <span>Found {results.length} authorities across collections</span>
            <span className="text-[10px] font-mono text-[#A69371]">Ranked by relevance</span>
          </div>

          {results.map((item) => {
            const isFederalLaw = item.sourceCategory === "federal_law";
            const isFederalGuidance = item.sourceCategory === "federal_guidance";
            const isStateLaw = item.sourceCategory === "state_law";

            return (
              <div
                key={`${item.sourceCategory}-${item.id}`}
                onClick={() => handleOpenResult(item)}
                className="group cursor-pointer relative rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 hover:border-[#C5A059]/80 p-5 sm:p-6 transition-all duration-200 shadow-[0_6px_20px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:shadow-[0_8px_30px_rgba(197,160,89,0.2)] space-y-3"
              >
                {/* Header Tag Ribbons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Collection badge */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                        isFederalLaw
                          ? "bg-blue-950/80 text-blue-300 border border-blue-800"
                          : isFederalGuidance
                          ? "bg-purple-950/80 text-purple-300 border border-purple-800"
                          : "bg-emerald-950/80 text-emerald-300 border border-emerald-800"
                      }`}
                    >
                      {isFederalLaw ? "Federal Law" : isFederalGuidance ? "Federal Guidance" : "State Law"}
                    </span>

                    {/* Authority Level Tag */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                        item.isBindingLaw
                          ? "bg-[#C5A059]/20 text-[#FFE394] border border-[#C5A059]/40"
                          : "bg-[#020A17] text-[#C6B697] border border-[#3A2C18]"
                      }`}
                    >
                      {item.authorityType}
                    </span>

                    <span className="text-xs font-mono font-bold text-[#FFF4D4]">
                      {item.citation}
                    </span>
                  </div>

                  <span className="text-xs text-[#A69371] font-medium">{item.jurisdiction}</span>
                </div>

                {/* Title */}
                <h3 className="text-base sm:text-lg font-serif font-bold text-[#FFF4D4] group-hover:text-[#FFE394] transition-colors leading-snug">
                  {item.title}
                </h3>

                {/* Summary */}
                <p className="text-xs sm:text-sm text-[#C6B697] leading-relaxed line-clamp-3">
                  {item.summary}
                </p>

                {/* Bottom Action Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-[#3A2C18]/60 text-xs">
                  <div className="flex items-center gap-1 text-[11px] text-[#A69371]">
                    <span>Status: {item.status}</span>
                  </div>

                  <div className="flex items-center gap-1 text-[#C5A059] font-bold group-hover:translate-x-0.5 transition-transform">
                    <span>
                      {isFederalGuidance
                        ? "Open Guidance Reader"
                        : isFederalLaw
                        ? "View Federal Provision"
                        : "Open Official Code"}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reader Modal for Guidance */}
      <FederalGuidanceReader
        document={activeGuidance}
        isOpen={!!activeGuidance}
        onClose={() => setActiveGuidance(null)}
      />

      {/* Save Modal for Federal Provision */}
      <SaveFederalLegalToCaseNoteModal
        provision={activeProvision}
        isOpen={!!activeProvision}
        onClose={() => setActiveProvision(null)}
      />
    </div>
  );
}
