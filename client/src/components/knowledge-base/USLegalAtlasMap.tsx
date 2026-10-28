import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  UNIFIED_STATE_PATHS,
  MAP_WIDTH,
  MAP_HEIGHT,
  type StateGeography,
} from "../national-coverage/unifiedMapData";
import {
  Search,
  Scale,
  Compass,
  MapPin,
  Check,
  ChevronDown,
  X,
  ExternalLink,
  Layers,
  Maximize2,
  Minimize2,
} from "lucide-react";
import type { StateJurisdiction } from "../../../../shared/stateEducationLawData";

/**
 * Mapping from unified map name to official 2-letter postal code
 */
const STATE_NAME_TO_CODE: Record<string, string> = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  "District of Columbia": "DC",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
};

interface TooltipInfo {
  name: string;
  code: string;
  timeline?: string;
  transitionAge?: string;
  agency?: string;
  x: number;
  y: number;
}

export interface USLegalAtlasMapProps {
  selectedStateCode: string;
  onSelectState: (stateCode: string) => void;
  statesList: StateJurisdiction[];
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export default function USLegalAtlasMap({
  selectedStateCode,
  onSelectState,
  statesList,
  isExpanded = true,
  onToggleExpand,
}: USLegalAtlasMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredState, setHoveredState] = useState<TooltipInfo | null>(null);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const comboboxRef = useRef<HTMLDivElement>(null);

  // Fast dictionary for state lookup by code
  const stateByCode = useMemo(() => {
    const map = new Map<string, StateJurisdiction>();
    statesList.forEach((s) => map.set(s.code, s));
    return map;
  }, [statesList]);

  // Current active jurisdiction
  const activeJurisdiction = useMemo(() => {
    return stateByCode.get(selectedStateCode) || stateByCode.get("US");
  }, [stateByCode, selectedStateCode]);

  // Filtered list for the searchable state selector (Method B)
  const filteredStates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return statesList;
    return statesList.filter(
      (s) =>
        s.code.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        (s.educationAgencyName && s.educationAgencyName.toLowerCase().includes(q))
    );
  }, [statesList, searchQuery]);

  // Handle map state hover
  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<SVGElement>, stateName: string) => {
      const code = STATE_NAME_TO_CODE[stateName] || stateName;
      const meta = stateByCode.get(code);
      const rect = containerRef.current?.getBoundingClientRect();

      if (rect) {
        setHoveredState({
          name: meta?.name || stateName,
          code,
          timeline: meta?.evaluationTimeline,
          transitionAge: meta?.transitionAge,
          agency: meta?.educationAgencyName,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    },
    [stateByCode]
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setHoveredState((prev) =>
        prev
          ? {
              ...prev,
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
            }
          : null
      );
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredState(null);
  }, []);

  // Keyboard accessibility for state selection
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, code: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelectState(code);
      }
    },
    [onSelectState]
  );

  // Close combobox when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setComboboxOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Determine if a state is currently selected
  const isSelected = (stateName: string) => {
    const code = STATE_NAME_TO_CODE[stateName];
    return selectedStateCode === code;
  };

  const isDCOrSelected = selectedStateCode === "DC";
  const isFederalSelected = selectedStateCode === "US" || selectedStateCode === "FED";

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl border border-[#3A2C18] bg-[#000820] shadow-[0_12px_36px_rgba(0,0,0,0.92),inset_0_1px_2px_rgba(255,255,255,0.06)] overflow-hidden transition-all duration-300"
    >
      {/* ── Precision Atmospheric Background Vignette ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(16,43,78,0.35) 0%, rgba(7,22,43,0.7) 50%, #000820 100%)",
        }}
      />

      {/* ── Top Control Bar: Searchable Selector (Method B) + View Toggles ── */}
      <div className="relative z-20 px-4 pt-4 pb-3 sm:px-6 sm:pt-5 border-b border-[#3A2C18]/60 bg-[#05142B]/85 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Method B: Prominent Searchable State Selector */}
        <div className="relative flex-1 max-w-md" ref={comboboxRef}>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#C5A059] shrink-0 hidden sm:inline-block">
              Jurisdiction:
            </span>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C5A059] pointer-events-none" />
              <input
                type="text"
                value={
                  comboboxOpen
                    ? searchQuery
                    : activeJurisdiction
                    ? `${activeJurisdiction.name} (${activeJurisdiction.code})`
                    : "Select a jurisdiction..."
                }
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!comboboxOpen) setComboboxOpen(true);
                }}
                onFocus={() => {
                  setComboboxOpen(true);
                  setSearchQuery("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && filteredStates.length > 0) {
                    e.preventDefault();
                    onSelectState(filteredStates[0].code);
                    setComboboxOpen(false);
                    setSearchQuery("");
                  } else if (e.key === "Escape") {
                    setComboboxOpen(false);
                  }
                }}
                placeholder="Type state name or postal code (e.g. Georgia, GA)..."
                className="w-full h-10 pl-9 pr-9 rounded-xl bg-[#020A17] border border-[#3A2C18] text-xs sm:text-sm text-[#FFF4D4] placeholder-[#A69371] focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all"
                aria-label="Search and select state jurisdiction"
              />

              {activeJurisdiction && !comboboxOpen && (
                <button
                  type="button"
                  onClick={() => {
                    setComboboxOpen(true);
                    setSearchQuery("");
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#C5A059] hover:text-[#FFF4D4] transition-colors"
                  aria-label="Change state"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              )}

              {comboboxOpen && searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#A69371] hover:text-[#FFF4D4] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Combobox Dropdown Results */}
          {comboboxOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-[#3A2C18] bg-[#020A17] shadow-[0_12px_32px_rgba(0,0,0,0.95)] z-50 divide-y divide-[#3A2C18]/40">
              {filteredStates.length === 0 ? (
                <div className="p-3 text-xs text-[#A69371] text-center">
                  No jurisdictions match "{searchQuery}"
                </div>
              ) : (
                filteredStates.map((st) => {
                  const isCur = st.code === selectedStateCode;
                  return (
                    <button
                      key={st.code}
                      type="button"
                      onClick={() => {
                        onSelectState(st.code);
                        setComboboxOpen(false);
                        setSearchQuery("");
                      }}
                      className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        isCur
                          ? "bg-[#C5A059]/20 text-[#FFE394]"
                          : "text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono font-bold text-xs px-1.5 py-0.5 rounded bg-[#07162B] border border-[#3A2C18] text-[#C5A059] shrink-0">
                          {st.code}
                        </span>
                        <div className="truncate">
                          <span className="font-medium">{st.name}</span>
                          {st.evaluationTimeline && (
                            <span className="text-[11px] text-[#A69371] ml-2 hidden sm:inline">
                              · {st.evaluationTimeline}
                            </span>
                          )}
                        </div>
                      </div>
                      {isCur && <Check className="w-4 h-4 text-[#C5A059] shrink-0 ml-2" />}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Federal Law Toggle & View Controls */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Federal Law Toggle Button */}
          <button
            type="button"
            onClick={() => onSelectState("US")}
            className={`h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border ${
              isFederalSelected
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border-[#FFE394] shadow-[0_2px_10px_rgba(197,160,89,0.35)]"
                : "bg-[#020A17] text-[#D8C7A5] border-[#3A2C18] hover:bg-[#07162B] hover:text-[#FFF4D4]"
            }`}
            title="Federal Special Education Law (IDEA · Section 504 · ADA)"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Federal Statutes (IDEA / 504)</span>
          </button>

          {/* Expand / Collapse Map Toggle */}
          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="h-9 px-2.5 rounded-xl text-xs font-medium flex items-center gap-1.5 bg-[#020A17] border border-[#3A2C18] text-[#A69371] hover:text-[#FFF4D4] hover:bg-[#07162B] transition-colors cursor-pointer"
              title={isExpanded ? "Collapse Atlas Map" : "Expand Atlas Map"}
            >
              {isExpanded ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Compact</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Explore Map</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Interactive Map Canvas Container ── */}
      {isExpanded && (
        <div
          className="relative w-full overflow-hidden p-2 sm:p-4 select-none flex items-center justify-center min-h-[300px] sm:min-h-[440px] md:min-h-[500px]"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <svg
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            className="w-full h-auto max-h-[560px] drop-shadow-[0_8px_20px_rgba(0,0,0,0.8)]"
            preserveAspectRatio="xMidYMid meet"
            role="region"
            aria-label="Interactive United States Special Education Legal Atlas"
          >
            <defs>
              {/* Restrained Gold Fill Gradient for Selected State */}
              <linearGradient id="waypointSelectedGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#DFBE77" />
                <stop offset="45%" stopColor="#C5A059" />
                <stop offset="100%" stopColor="#8C6D32" />
              </linearGradient>

              {/* Gentle Glow Filter for Illuminated Selection */}
              <filter id="restrainedGoldGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#FFE394" floodOpacity="0.45" />
                <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#C5A059" floodOpacity="0.7" />
              </filter>

              {/* Subtle Inset Divider Pattern */}
              <linearGradient id="insetDivider" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="50%" stopColor="#3A2C18" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>

            {/* Geographic Inset Frames (Alaska & Hawaii) */}
            <g id="geographic-inset-frames" opacity="0.6">
              {/* Alaska Inset Boundary Box */}
              <rect
                x="148"
                y="400"
                width="160"
                height="126"
                rx="6"
                fill="none"
                stroke="#1E3A5F"
                strokeWidth="0.8"
                strokeDasharray="3 3"
              />
              <text
                x="154"
                y="412"
                fill="#C6B697"
                fontSize="9"
                fontFamily="'Playfair Display', Georgia, serif"
                letterSpacing="0.08em"
              >
                ALASKA
              </text>

              {/* Hawaii Inset Boundary Box */}
              <rect
                x="314"
                y="470"
                width="112"
                height="56"
                rx="6"
                fill="none"
                stroke="#1E3A5F"
                strokeWidth="0.8"
                strokeDasharray="3 3"
              />
              <text
                x="320"
                y="482"
                fill="#C6B697"
                fontSize="9"
                fontFamily="'Playfair Display', Georgia, serif"
                letterSpacing="0.08em"
              >
                HAWAII
              </text>
            </g>

            {/* 50 States + DC SVG Path Geometry */}
            <g id="us-state-paths" role="group">
              {UNIFIED_STATE_PATHS.map((st: StateGeography) => {
                const code = STATE_NAME_TO_CODE[st.name] || "";
                const selected = isSelected(st.name);
                const isHovered = hoveredState?.code === code;

                return (
                  <path
                    key={st.id}
                    id={`state-${st.id}`}
                    d={st.d}
                    role="button"
                    tabIndex={0}
                    aria-label={`${st.name} (${code}) Special Education Laws`}
                    aria-pressed={selected}
                    onMouseEnter={(e) => handleMouseEnter(e, st.name)}
                    onClick={() => onSelectState(code)}
                    onKeyDown={(e) => handleKeyDown(e, code)}
                    fill={
                      selected
                        ? "url(#waypointSelectedGold)"
                        : isHovered
                        ? "#0C2B54"
                        : "#04152D"
                    }
                    stroke={
                      selected
                        ? "#FFE394"
                        : isHovered
                        ? "#3D78B2"
                        : "#1A375C"
                    }
                    strokeWidth={selected ? 2 : isHovered ? 1.5 : 0.85}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    filter={selected ? "url(#restrainedGoldGlow)" : undefined}
                    className="cursor-pointer transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE394]"
                  />
                );
              })}
            </g>

            {/* ── Washington D.C. Accessible Target & Inset Callout ── */}
            <g id="washington-dc-callout" role="group">
              {/* Leader Line from DC coordinate [833.6, 236.6] to Callout [884, 256] */}
              <line
                x1="833.6"
                y1="236.6"
                x2="880"
                y2="256"
                stroke={isDCOrSelected ? "#FFE394" : "#C5A059"}
                strokeWidth={isDCOrSelected ? 1.5 : 1}
                strokeDasharray={isDCOrSelected ? "none" : "2 2"}
                opacity={0.85}
              />

              {/* DC Coordinate Pin Center */}
              <circle
                cx="833.6"
                cy="236.6"
                r={isDCOrSelected ? 4 : 2.5}
                fill={isDCOrSelected ? "#FFE394" : "#C5A059"}
                stroke="#000820"
                strokeWidth="1"
              />

              {/* DC Interactive Accessible Target Badge */}
              <g
                role="button"
                tabIndex={0}
                aria-label="Washington, D.C. (District of Columbia) Special Education Laws"
                aria-pressed={isDCOrSelected}
                onClick={() => onSelectState("DC")}
                onKeyDown={(e) => handleKeyDown(e, "DC")}
                onMouseEnter={(e) => handleMouseEnter(e, "District of Columbia")}
                className="cursor-pointer focus:outline-none"
              >
                <rect
                  x="880"
                  y="244"
                  width="44"
                  height="22"
                  rx="6"
                  fill={isDCOrSelected ? "url(#waypointSelectedGold)" : "#020A17"}
                  stroke={isDCOrSelected ? "#FFE394" : "#3A2C18"}
                  strokeWidth={isDCOrSelected ? 1.8 : 1}
                  filter={isDCOrSelected ? "url(#restrainedGoldGlow)" : undefined}
                />
                <text
                  x="902"
                  y="259"
                  textAnchor="middle"
                  fill={isDCOrSelected ? "#07162B" : "#FFE394"}
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  D.C.
                </text>
              </g>
            </g>
          </svg>

          {/* ── Synchronized Hover Tooltip Overlay ── */}
          {hoveredState && (
            <div
              className="absolute pointer-events-none z-30 transform -translate-x-1/2 -translate-y-full mb-3 rounded-xl border border-[#FFE394]/40 bg-[#020A17]/95 px-3.5 py-2.5 shadow-[0_10px_24px_rgba(0,0,0,0.95)] backdrop-blur-md max-w-xs transition-opacity duration-150"
              style={{
                left: `${hoveredState.x}px`,
                top: `${hoveredState.y - 12}px`,
              }}
            >
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-sm text-[#FFF4D4]">
                  {hoveredState.name}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#C5A059]/20 text-[#FFE394] border border-[#C5A059]/40">
                  {hoveredState.code}
                </span>
              </div>

              {hoveredState.agency && (
                <div className="text-[11px] text-[#C6B697] truncate mt-0.5 max-w-[220px]">
                  {hoveredState.agency}
                </div>
              )}

              {hoveredState.timeline && (
                <div className="text-[11px] text-[#DFBE77] font-medium mt-1 pt-1 border-t border-[#3A2C18]/60 flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-mono text-[#A69371]">
                    Eval:
                  </span>
                  <span>{hoveredState.timeline}</span>
                </div>
              )}

              <div className="text-[10px] text-[#A69371] italic mt-1">
                Click to load statutory authorities & regulations
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Bottom Atlas Instrument Footer Strip ── */}
      <div className="px-4 py-2.5 sm:px-6 bg-[#020A17]/90 border-t border-[#3A2C18]/50 flex items-center justify-between text-xs text-[#A69371] flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Compass className="w-3.5 h-3.5 text-[#C5A059]" />
          <span>
            National Legal Atlas ·{" "}
            <span className="text-[#FFF4D4]">50 States + D.C. + Federal Statutes</span>
          </span>
        </div>

        {activeJurisdiction && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase text-[#C5A059]">
              Active:
            </span>
            <span className="font-serif font-bold text-[#FFF4D4]">
              {activeJurisdiction.name}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#C5A059]/20 text-[#FFE394] border border-[#C5A059]/30">
              {activeJurisdiction.code}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
