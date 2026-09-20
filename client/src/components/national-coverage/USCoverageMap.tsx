import React, { useState, useMemo } from "react";
import { geoAlbersUsa } from "d3-geo";
import {
  UNIFIED_STATE_PATHS,
  MAP_WIDTH,
  MAP_HEIGHT,
  PROJECTION_SCALE,
  PROJECTION_TRANSLATE,
} from "./unifiedMapData";
import { cn } from "@/lib/utils";
import { MapPin, X, CheckCircle2, AlertCircle, Wrench } from "lucide-react";

export interface MapClientItem {
  id: number;
  name: string;
  studentName?: string;
  parentName?: string;
  city: string;
  state: string;
  zipCode?: string;
  timeZone: string;
  timeZoneName: string;
  status: "active" | "meeting_today" | "needs_attention" | "onboarding" | "paused" | "inactive";
  latitude?: number | string | null;
  longitude?: number | string | null;
  mapX: number | null;
  mapY: number | null;
  locationAccuracy?: string;
  accuracyLabel?: string;
  isAlaska: boolean;
  isHawaii: boolean;
  hasLocation?: boolean;
  localTime: string;
  diffHours: number;
  diffText: string;
  callingStatus: "green" | "yellow" | "red";
  callingStatusLabel: string;
  recommendation: string;
  hasMeetingToday: boolean;
  hasMeetingThisWeek?: boolean;
  nextMeeting: {
    title: string;
    dateStr: string | null;
    timeStr: string | null;
    link?: string | null;
  } | null;
  assignedAdvocate: string;
  planType?: string;
  schoolDistrict?: string;
  phone?: string;
}

interface USCoverageMapProps {
  clients?: MapClientItem[];
  selectedClientId?: number | null;
  onSelectClient?: (client: MapClientItem) => void;
  showAllClients?: boolean;
  reducedMotion?: boolean;
}

interface ProjectedClientItem extends MapClientItem {
  projectedX: number;
  projectedY: number;
}

interface ClusterGroup {
  id: string;
  x: number;
  y: number;
  items: ProjectedClientItem[];
  isCluster: boolean;
  hasMeetingToday: boolean;
  hasNeedsAttention: boolean;
}

// Single unified projection engine used for BOTH state paths and markers
const projection = geoAlbersUsa()
  .scale(PROJECTION_SCALE)
  .translate(PROJECTION_TRANSLATE);

// Verification Test Locations
const ATLANTA_TEST_LOCATION = {
  name: "Atlanta Projection Test",
  coordinates: [-84.388, 33.749] as [number, number],
};

const SEVEN_TEST_LOCATIONS = [
  { name: "Atlanta", state: "Georgia", coordinates: [-84.388, 33.749] as [number, number] },
  { name: "Los Angeles", state: "California", coordinates: [-118.2437, 34.0522] as [number, number] },
  { name: "Denver", state: "Colorado", coordinates: [-104.9903, 39.7392] as [number, number] },
  { name: "Chicago", state: "Illinois", coordinates: [-87.6298, 41.8781] as [number, number] },
  { name: "New York", state: "New York", coordinates: [-74.006, 40.7128] as [number, number] },
  { name: "Anchorage", state: "Alaska", coordinates: [-149.9003, 61.2181] as [number, number] },
  { name: "Honolulu", state: "Hawaii", coordinates: [-157.8581, 21.3099] as [number, number] },
];

/**
 * PG-041 · National Coverage
 * United States National Client Distribution
 *
 * Built with ONE Geographic Engine:
 * - 51 state paths generated directly from US Census Bureau Albers USA geometry
 * - Zero nested matrix transforms: state paths and markers exist in the EXACT same SVG coordinate space
 * - Zero upper-left (0,0) fallbacks: missing or invalid coordinates are never rendered
 */
export function USCoverageMap({
  clients = [],
  selectedClientId = null,
  onSelectClient,
  showAllClients = false,
  reducedMotion = false,
}: USCoverageMapProps) {
  const [activeCluster, setActiveCluster] = useState<ClusterGroup | null>(null);
  const [testMode, setTestMode] = useState<"live" | "atlanta" | "seven_cities">("live");
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  // Validate and project clients into SVG coordinates (PG-041)
  const projectedClients = useMemo(() => {
    const targetClients = showAllClients
      ? clients
      : selectedClientId != null
      ? clients.filter((c) => c.id === selectedClientId)
      : [];

    const valid: ProjectedClientItem[] = [];

    for (const client of targetClients) {
      const lat = client.latitude != null ? Number(client.latitude) : null;
      const lon = client.longitude != null ? Number(client.longitude) : null;

      const validCoordinates =
        lat !== null &&
        lon !== null &&
        Number.isFinite(lat) &&
        Number.isFinite(lon) &&
        !(lat === 0 && lon === 0);

      // Never place invalid or missing coordinates on the map
      if (!validCoordinates) {
        continue;
      }

      let cleanLat = lat;
      let cleanLon = lon;

      // Correct for accidental latitude/longitude swap
      if (cleanLat < 0 && cleanLon > 0) {
        const tmp = cleanLat;
        cleanLat = cleanLon;
        cleanLon = tmp;
      }
      // US longitudes must remain negative
      if (cleanLon > 0 && cleanLon <= 180) {
        cleanLon = -cleanLon;
      }

      let p: [number, number] | null = null;
      if (cleanLat >= 18 && cleanLat <= 72 && cleanLon >= -180 && cleanLon <= -65) {
        const pt = projection([cleanLon, cleanLat]);
        if (pt && Number.isFinite(pt[0]) && Number.isFinite(pt[1])) {
          p = [pt[0], pt[1]];
        }
      }

      // If coordinates cannot be projected by the geographic engine, omit from map
      if (!p) continue;

      valid.push({
        ...client,
        projectedX: p[0],
        projectedY: p[1],
      });
    }

    return valid;
  }, [clients, showAllClients, selectedClientId]);

  // Spatial clustering algorithm: cluster points within 28 SVG units of each other
  const clusters = useMemo(() => {
    const clusterThreshold = 28;
    const groups: ClusterGroup[] = [];

    projectedClients.forEach((client) => {
      let matched = false;
      for (const group of groups) {
        const dist = Math.hypot(group.x - client.projectedX, group.y - client.projectedY);
        if (dist < clusterThreshold) {
          group.items.push(client);
          group.isCluster = true;
          if (client.hasMeetingToday) group.hasMeetingToday = true;
          if (client.status === "needs_attention") group.hasNeedsAttention = true;
          matched = true;
          break;
        }
      }

      if (!matched) {
        groups.push({
          id: `cluster-${client.id}`,
          x: client.projectedX,
          y: client.projectedY,
          items: [client],
          isCluster: false,
          hasMeetingToday: client.hasMeetingToday,
          hasNeedsAttention: client.status === "needs_attention",
        });
      }
    });

    return groups;
  }, [projectedClients]);

  // Diagnostic records for Step 6 inspection (PG-041)
  const diagnosticRecords = useMemo(() => {
    return clients.map((c) => {
      const lat = c.latitude != null ? Number(c.latitude) : null;
      const lon = c.longitude != null ? Number(c.longitude) : null;

      const validCoordinates =
        lat !== null &&
        lon !== null &&
        Number.isFinite(lat) &&
        Number.isFinite(lon) &&
        !(lat === 0 && lon === 0);

      let pt: [number, number] | null = null;
      if (validCoordinates) {
        let cleanLat = lat;
        let cleanLon = lon;
        if (cleanLat < 0 && cleanLon > 0) {
          cleanLat = lon;
          cleanLon = lat;
        }
        if (cleanLon > 0 && cleanLon <= 180) {
          cleanLon = -cleanLon;
        }
        const projected = projection([cleanLon, cleanLat]);
        if (projected && Number.isFinite(projected[0]) && Number.isFinite(projected[1])) {
          pt = [projected[0], projected[1]];
        }
      }

      return {
        id: c.id,
        name: c.studentName || c.name,
        location: `${c.city || ""}, ${c.state || ""} ${c.zipCode || ""}`.trim() || "Location unavailable",
        latitude: c.latitude != null && String(c.latitude).trim() !== "" ? String(c.latitude) : "null",
        longitude: c.longitude != null && String(c.longitude).trim() !== "" ? String(c.longitude) : "null",
        accuracy: c.accuracyLabel || c.locationAccuracy || "Unknown",
        passedValidation: validCoordinates && pt !== null,
        projectedPoint: pt ? `[${Math.round(pt[0])}, ${Math.round(pt[1])}]` : "Not available",
      };
    });
  }, [clients]);

  return (
    <div
      role="region"
      aria-label="United States National Client Distribution"
      className="relative w-full rounded-3xl bg-[#02162b] border border-[#174275] p-2 sm:p-3 md:p-4 overflow-hidden shadow-2xl transition-all space-y-4"
    >
      {/* Test Verification Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-2 pt-1 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Map Mode:</span>
          <div className="flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-slate-700">
            <button
              type="button"
              onClick={() => setTestMode("live")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                testMode === "live" ? "bg-sky-600 text-white shadow" : "text-slate-400 hover:text-white"
              )}
            >
              Live CRM Clients
            </button>
            <button
              type="button"
              onClick={() => setTestMode("atlanta")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                testMode === "atlanta" ? "bg-amber-600 text-white shadow" : "text-slate-400 hover:text-white"
              )}
            >
              Step 4: Atlanta Test
            </button>
            <button
              type="button"
              onClick={() => setTestMode("seven_cities")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                testMode === "seven_cities" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
              )}
            >
              Step 5: 7 Cities Test
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowDiagnostics((prev) => !prev)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg border transition-colors",
            showDiagnostics
              ? "bg-slate-800 border-sky-500 text-sky-300"
              : "border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800/60"
          )}
        >
          <Wrench className="w-3.5 h-3.5" />
          Step 6: Coordinate Diagnostics ({clients.length})
        </button>
      </div>

      {/* SVG Canvas (1024 x 551 aspect ratio matching approved design) */}
      <div className="w-full relative select-none">
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="w-full h-auto block"
          style={{
            shapeRendering: "geometricPrecision",
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          }}
          aria-hidden="true"
        >
          <defs>
            {/* Subtle electric blue edge glow */}
            <filter id="borderSubtleGlow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#2563eb" floodOpacity="0.35" />
            </filter>

            {/* Meeting Today radiant halo */}
            <radialGradient id="meetingAura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#4f46e5" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0" />
            </radialGradient>

            {/* Highlighted marker aura for selected client */}
            <radialGradient id="selectedAura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#0284c7" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Outer container border inside SVG canvas */}
          <rect
            x="17"
            y="10"
            width="988"
            height="528"
            rx="20"
            fill="#02162b"
            stroke="#174275"
            strokeWidth="1.5"
          />

          {/* Decorative Inset Box for ALASKA */}
          <rect
            x="38"
            y="390"
            width="270"
            height="140"
            rx="16"
            fill="#02162b"
            stroke="#174275"
            strokeWidth="1.5"
          />
          <text
            x="173"
            y="522"
            fill="#ffffff"
            fontSize="13"
            fontWeight="700"
            letterSpacing="2"
            textAnchor="middle"
            className="pointer-events-none"
          >
            ALASKA
          </text>

          {/* Decorative Inset Box for HAWAII */}
          <rect
            x="315"
            y="442"
            width="104"
            height="88"
            rx="16"
            fill="#02162b"
            stroke="#174275"
            strokeWidth="1.5"
          />
          <text
            x="367"
            y="522"
            fill="#ffffff"
            fontSize="13"
            fontWeight="700"
            letterSpacing="2"
            textAnchor="middle"
            className="pointer-events-none"
          >
            HAWAII
          </text>

          {/* 1. ALL 51 US STATE PATHS (Drawn directly in shared geographic coordinate system) */}
          <g id="united-states-map">
            {UNIFIED_STATE_PATHS.map((state) => (
              <path
                key={state.id}
                id={`state-${state.id}`}
                d={state.d}
                fill={state.fill}
                stroke="#2563eb"
                strokeWidth="0.85"
                strokeLinejoin="round"
                className="transition-colors duration-150"
              >
                <title>{state.name}</title>
              </path>
            ))}
          </g>

          {/* 2. FOUR REGIONAL LABELS (Clean, bold, uppercase sans-serif) */}
          <text
            x="210"
            y="210"
            fill="#ffffff"
            fontSize="14"
            fontWeight="700"
            letterSpacing="1.5"
            textAnchor="middle"
            className="pointer-events-none"
          >
            PACIFIC
          </text>

          <text
            x="380"
            y="240"
            fill="#ffffff"
            fontSize="14"
            fontWeight="700"
            letterSpacing="1.5"
            textAnchor="middle"
            className="pointer-events-none"
          >
            MOUNTAIN
          </text>

          <text
            x="555"
            y="295"
            fill="#ffffff"
            fontSize="14"
            fontWeight="700"
            letterSpacing="1.5"
            textAnchor="middle"
            className="pointer-events-none"
          >
            CENTRAL
          </text>

          <text
            x="770"
            y="305"
            fill="#ffffff"
            fontSize="14"
            fontWeight="700"
            letterSpacing="1.5"
            textAnchor="middle"
            className="pointer-events-none"
          >
            EASTERN
          </text>

          {/* 3. LEGEND BOX (Lower-Right Corner) */}
          <g id="legend-box">
            <rect
              x="825"
              y="401"
              width="164"
              height="117"
              rx="16"
              fill="#02162b"
              stroke="#174275"
              strokeWidth="1.5"
            />

            {/* Active Client */}
            <circle cx="848" cy="426" r="6" fill="#4ade80" />
            <text
              x="868"
              y="430"
              fill="#cbd5e1"
              fontSize="12"
              fontWeight="500"
              dominantBaseline="middle"
            >
              Active Client
            </text>

            {/* Meeting Today */}
            <g>
              <circle
                cx="848"
                cy="460"
                r={reducedMotion ? 9 : 12}
                fill="url(#meetingAura)"
              />
              <circle
                cx="848"
                cy="460"
                r="7"
                fill="#3b82f6"
                stroke="#818cf8"
                strokeWidth="2"
              />
              <circle cx="848" cy="460" r="3.5" fill="#ffffff" />
            </g>
            <text
              x="868"
              y="464"
              fill="#cbd5e1"
              fontSize="12"
              fontWeight="500"
              dominantBaseline="middle"
            >
              Meeting Today
            </text>

            {/* Needs Attention */}
            <circle cx="848" cy="494" r="6" fill="#f43f5e" />
            <text
              x="868"
              y="498"
              fill="#cbd5e1"
              fontSize="12"
              fontWeight="500"
              dominantBaseline="middle"
            >
              Needs Attention
            </text>
          </g>

          {/* 4. MARKERS LAYER (Shared geographic coordinate space) */}
          <g id="map-markers">
            {/* STEP 4 VERIFICATION: ONLY ATLANTA */}
            {testMode === "atlanta" && (() => {
              const pt = projection(ATLANTA_TEST_LOCATION.coordinates);
              if (!pt) return null;
              return (
                <g key="atlanta-test-marker" className="cursor-pointer">
                  <circle cx={pt[0]} cy={pt[1]} r={20} fill="#f59e0b" opacity="0.3" className="animate-ping" />
                  <circle cx={pt[0]} cy={pt[1]} r={12} fill="#02162b" stroke="#f59e0b" strokeWidth={3} />
                  <circle cx={pt[0]} cy={pt[1]} r={6} fill="#fbbf24" />
                  <rect x={pt[0] - 70} y={pt[1] - 34} width={140} height={24} rx={6} fill="#0f172a" stroke="#f59e0b" strokeWidth={1} />
                  <text x={pt[0]} y={pt[1] - 18} fill="#ffffff" fontSize="11" fontWeight="700" textAnchor="middle">
                    Atlanta Test (Georgia)
                  </text>
                  <title>Atlanta Projection Test: [-84.388, 33.749]</title>
                </g>
              );
            })()}

            {/* STEP 5 VERIFICATION: ALL 7 PROJECTION TEST CITIES */}
            {testMode === "seven_cities" &&
              SEVEN_TEST_LOCATIONS.map((loc) => {
                const pt = projection(loc.coordinates);
                if (!pt) return null;
                return (
                  <g key={loc.name} className="cursor-pointer">
                    <circle cx={pt[0]} cy={pt[1]} r={14} fill="#02162b" stroke="#38bdf8" strokeWidth={2.5} />
                    <circle cx={pt[0]} cy={pt[1]} r={6} fill="#38bdf8" />
                    <rect x={pt[0] - 45} y={pt[1] - 28} width={90} height={20} rx={4} fill="#0f172a" stroke="#38bdf8" strokeWidth={1} />
                    <text x={pt[0]} y={pt[1] - 14} fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle">
                      {loc.name}
                    </text>
                    <title>{`${loc.name}, ${loc.state}: [${loc.coordinates.join(", ")}]`}</title>
                  </g>
                );
              })}

            {/* LIVE CLIENT MARKERS & CLUSTERS */}
            {testMode === "live" &&
              clusters.map((group) => {
                const isSelected = group.items.some((c) => c.id === selectedClientId);

                // Cluster of 2+ Clients
                if (group.isCluster) {
                  return (
                    <g
                      key={group.id}
                      className="cursor-pointer group select-none"
                      onClick={() => setActiveCluster(group)}
                    >
                      {/* Invisible generous hit area */}
                      <circle cx={group.x} cy={group.y} r={22} fill="transparent" />

                      {/* Cluster hover ring */}
                      <circle
                        cx={group.x}
                        cy={group.y}
                        r={isSelected ? 20 : 18}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth={1.5}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
                      />

                      {/* Cluster badge background */}
                      <circle
                        cx={group.x}
                        cy={group.y}
                        r={isSelected ? 16 : 14}
                        fill="#071d3a"
                        stroke={isSelected ? "#ffffff" : group.hasMeetingToday ? "#818cf8" : "#38bdf8"}
                        strokeWidth={isSelected ? 3 : 2}
                        className="transition-colors duration-150 group-hover:stroke-white drop-shadow-lg"
                      />
                      <text
                        x={group.x}
                        y={group.y}
                        dy="0.35em"
                        fill="#ffffff"
                        fontSize={11}
                        fontWeight="800"
                        textAnchor="middle"
                        className="pointer-events-none select-none"
                      >
                        {group.items.length}
                      </text>
                      <title>{`${group.items.length} clients in this area (click to view)`}</title>
                    </g>
                  );
                }

                // Single Client Marker
                const client = group.items[0];
                const hasMeetingToday = client.hasMeetingToday;
                const isNeedsAttention = client.status === "needs_attention";
                const isOnboarding = client.status === "onboarding";
                const isPaused = client.status === "paused" || client.status === "inactive";

                const markerFill = isNeedsAttention
                  ? "#f43f5e"
                  : isOnboarding
                  ? "#f59e0b"
                  : isPaused
                  ? "#94a3b8"
                  : "#4ade80"; // Default Active

                return (
                  <g
                    key={client.id}
                    className="cursor-pointer group select-none"
                    onClick={() => onSelectClient?.(client)}
                  >
                    {/* Invisible generous hit target (36px diameter) for easy clicking without jitter */}
                    <circle cx={group.x} cy={group.y} r={18} fill="transparent" />

                    {/* Selected Halo / Emphasis Ring */}
                    {isSelected && (
                      <g className="pointer-events-none">
                        <circle
                          cx={group.x}
                          cy={group.y}
                          r={18}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth={2}
                          strokeDasharray="4 2"
                          opacity="0.9"
                        />
                        <circle cx={group.x} cy={group.y} r={24} fill="url(#selectedAura)" opacity="0.6" />
                      </g>
                    )}

                    {/* Smooth Hover Halo (Appears stably without moving the element) */}
                    <circle
                      cx={group.x}
                      cy={group.y}
                      r={13}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
                    />

                    {/* Meeting Today Glowing Ring */}
                    {hasMeetingToday && (
                      <g className="pointer-events-none">
                        <circle
                          cx={group.x}
                          cy={group.y}
                          r={reducedMotion ? 12 : 14}
                          fill="url(#meetingAura)"
                          className={reducedMotion ? "" : "animate-pulse"}
                        />
                        <circle
                          cx={group.x}
                          cy={group.y}
                          r={9}
                          fill="#3b82f6"
                          stroke="#818cf8"
                          strokeWidth={2}
                        />
                      </g>
                    )}

                    {/* Main Client Circle - Rock-solid position with smooth color highlights */}
                    <circle
                      cx={group.x}
                      cy={group.y}
                      r={isSelected ? 8 : hasMeetingToday ? 5 : 7}
                      fill={hasMeetingToday ? "#ffffff" : markerFill}
                      stroke={isSelected ? "#ffffff" : "#02162b"}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      className="transition-colors duration-150 group-hover:stroke-white drop-shadow-md pointer-events-none"
                    />

                    <title>
                      {`${client.studentName || client.name} — ${
                        client.city ? `${client.city}, ${client.state}` : client.state || "Approximate location"
                      } (${client.timeZoneName})`}
                    </title>
                  </g>
                );
              })}
          </g>
        </svg>
      </div>

      {/* Step 6: Developer Diagnostics Table (Collapsible) */}
      {showDiagnostics && (
        <div className="rounded-xl bg-slate-900/95 border border-sky-500/40 p-4 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
              <Wrench className="w-4 h-4" />
              <span>Step 6: Geographic Coordinate Diagnostics ({diagnosticRecords.length} records)</span>
            </div>
            <span className="text-[11px] text-slate-400">Zero street addresses transmitted</span>
          </div>

          <div className="overflow-x-auto max-h-60 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-1.5 px-2">ID</th>
                  <th className="py-1.5 px-2">Client Name</th>
                  <th className="py-1.5 px-2">City, State, ZIP</th>
                  <th className="py-1.5 px-2">Latitude</th>
                  <th className="py-1.5 px-2">Longitude</th>
                  <th className="py-1.5 px-2">Accuracy Type</th>
                  <th className="py-1.5 px-2 text-center">Validated?</th>
                  <th className="py-1.5 px-2">Projected Point [x, y]</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {diagnosticRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40">
                    <td className="py-1.5 px-2 text-slate-400">{r.id}</td>
                    <td className="py-1.5 px-2 font-sans font-medium text-white">{r.name}</td>
                    <td className="py-1.5 px-2 font-sans text-slate-300">{r.location || "Missing"}</td>
                    <td className="py-1.5 px-2 text-slate-300">{r.latitude}</td>
                    <td className="py-1.5 px-2 text-slate-300">{r.longitude}</td>
                    <td className="py-1.5 px-2 text-slate-400 font-sans">{r.accuracy}</td>
                    <td className="py-1.5 px-2 text-center">
                      {r.passedValidation ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 inline" />
                      )}
                    </td>
                    <td className={cn("py-1.5 px-2", r.passedValidation ? "text-sky-300" : "text-rose-400/80 italic")}>
                      {r.projectedPoint}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cluster Popover (When clicking a cluster of multiple clients) */}
      {activeCluster && (
        <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-[#071d3a] border border-sky-500/40 p-4 shadow-2xl text-white space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-slate-200">
                  {activeCluster.items.length} Clients in this Area
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveCluster(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-slate-800 max-h-56 overflow-y-auto">
              {activeCluster.items.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onSelectClient?.(c);
                    setActiveCluster(null);
                  }}
                  className="w-full text-left py-2.5 px-2 hover:bg-sky-900/40 rounded-lg transition-colors flex items-center justify-between gap-3 group"
                >
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-sky-300">
                      {c.studentName || c.name}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {c.city ? `${c.city}, ${c.state}` : c.state} · {c.timeZoneName}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-semibold",
                      c.status === "active"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-sky-500/20 text-sky-300"
                    )}
                  >
                    {c.status.replace("_", " ")}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
