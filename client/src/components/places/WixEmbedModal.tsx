import React, { useState } from "react";
import {
  Check,
  Code2,
  Copy,
  Eye,
  ExternalLink,
  Globe,
  RotateCcw,
  Sliders,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_PUBLIC_SUBPAGE_TOGGLES,
  PUBLIC_SUBPAGE_TOGGLE_METADATA,
  type PublicSubPageSectionToggles,
} from "../../../../shared/waypointPlaces";

interface WixEmbedModalProps {
  open: boolean;
  onClose: () => void;
  selectedFips: string;
  selectedCountyName: string;
  toggles: PublicSubPageSectionToggles;
  onUpdateToggles: (next: Partial<PublicSubPageSectionToggles>) => void;
  isPublicPreviewActive: boolean;
  onTogglePublicPreview: (active: boolean) => void;
}

const CLOUDFLARE_PRODUCTION_ORIGIN = "https://custom-crm-pro.clientcare-fa6.workers.dev";

export function WixEmbedModal({
  open,
  onClose,
  selectedFips,
  selectedCountyName,
  toggles,
  onUpdateToggles,
  isPublicPreviewActive,
  onTogglePublicPreview,
}: WixEmbedModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [lockDefaultCounty, setLockDefaultCounty] = useState(false);

  if (!open) return null;

  const embedUrl = lockDefaultCounty
    ? `${CLOUDFLARE_PRODUCTION_ORIGIN}/waypoint-places/public?embed=1&fips=${selectedFips}`
    : `${CLOUDFLARE_PRODUCTION_ORIGIN}/waypoint-places/public?embed=1`;

  const wixHtmlIframeSnippet = `<!-- Waypoint Places — Public County & IEP Relocation Sub-Page (Cloudflare Live Embed) -->
<div style="width:100%;max-width:100%;margin:0 auto;background:#07162B;border-radius:16px;overflow:hidden;border:2px solid #C5A059;box-shadow:0 16px 40px rgba(0,0,0,0.65);">
  <iframe
    id="waypoint-places-iframe"
    src="${embedUrl}"
    title="Waypoint Places — 50-State Special Education & Community Explorer"
    style="width:100%;height:1220px;border:0;display:block;background:#07162B;"
    allow="fullscreen; clipboard-write; geolocation"
    loading="lazy"
  ></iframe>
</div>
<script>
  window.addEventListener("message", function (event) {
    if (!event.data || typeof event.data !== "object") return;
    if (event.data.type === "WAYPOINT_PLACES_RESIZE" && event.data.height) {
      var frame = document.getElementById("waypoint-places-iframe");
      if (frame) frame.style.height = Math.max(920, Number(event.data.height)) + "px";
    }
  });
</script>`;

  const wixVeloPageSnippet = `// ============================================================================
// WIX VELO PAGE CODE — Waypoint Places Public Sub-Page (Cloudflare Worker + D1)
// 1. In Wix Editor, add an "Embed HTML" element and set its ID to: #html1
// 2. Paste the HTML Embed Code above into #html1
// ============================================================================
import { fetch } from 'wix-fetch';

const CLOUDFLARE_WORKER_URL = "${CLOUDFLARE_PRODUCTION_ORIGIN}";

$w.onReady(function () {
  if ($w("#html1") && typeof $w("#html1").onMessage === "function") {
    $w("#html1").onMessage((event) => {
      const payload = event.data;
      if (!payload || typeof payload !== "object") return;

      if (payload.type === "WAYPOINT_PLACES_COUNTY_SELECTED") {
        console.log("Visitor selected county:", payload.name, "FIPS:", payload.fips);
      }
    });
  }
});

// Optional: Fetch live county U.S. Census + School District data directly in Wix Velo
export async function getWaypointCountyDataFromCloudflare(countyFips5 = "${selectedFips}") {
  const inputParam = encodeURIComponent(JSON.stringify({ "0": { json: { countyFips5 } } }));
  const url = \`\${CLOUDFLARE_WORKER_URL}/api/trpc/waypointPlaces.getCountyNeighborhoodTracts?batch=1&input=\${inputParam}\`;
  const response = await fetch(url, { method: "GET" });
  const json = await response.json();
  return json?.[0]?.result?.data?.json || null;
}`;

  const handleCopy = (key: string, text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`Copied ${label} to clipboard!`);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2500);
  };

  const handleResetToRecommendedPublic = () => {
    onUpdateToggles({ ...DEFAULT_PUBLIC_SUBPAGE_TOGGLES });
    toast.success("Reset to Recommended Public County View (clean parent-friendly sections)");
  };

  const handleTurnAllOn = () => {
    const allOn: PublicSubPageSectionToggles = {
      showBannerHeader: true,
      showCategoryButtons: true,
      showQuickStatsCard: true,
      showFamilyPriorities: true,
      showCountyDemographics: true,
      showAreaScoresCard: true,
      showPublicSchoolsList: true,
      showCompareButton: true,
      showNeighborhoodTracts: true,
      showIepRightsCard: true,
      showSpecializedFacilities: true,
      showTherapyProvidersList: true,
      showCrimeAndApiGuide: true,
    };
    onUpdateToggles(allOn);
    toast.success("Enabled all sections for Public Sub-Page");
  };

  return (
    <div
      data-testid="wix-embed-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl rounded-2xl bg-gradient-to-b from-[#0A1D3B] via-[#07152C] to-[#040D1E] border-2 border-[#DFBE77] p-5 sm:p-6 text-[#FFF8E7] shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_30px_rgba(223,190,119,0.22)] space-y-5 my-auto max-h-[92vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#C5A059]/40 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-b from-[#FFE394] to-[#C59B43] text-[#07162B] flex items-center justify-center shadow-md shrink-0">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2
                className="text-lg sm:text-xl font-bold text-[#FFF8E7]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Public Website Sub-Page Controls &amp; Wix Embed
              </h2>
              <p className="text-xs text-[#EADBC0]">
                Toggle which sections appear publicly on your Wix website (<span className="text-[#FFE394]">waypointadvocates.com/relocation</span>) — changes sync live to Cloudflare!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#091830] border border-[#C5A059]/50 text-[#EADBC0] hover:text-white hover:border-[#FFE394] cursor-pointer"
            aria-label="Close embed modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* SECTION 1: PUBLIC SUB-PAGE SECTION TOGGLES (ON/OFF FOR EACH SECTION) */}
        <div className="rounded-xl bg-[#051126] border-2 border-[#22C55E]/70 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#4ADE80]">
                <Eye className="h-3.5 w-3.5" />
                1. Public Sub-Page Section Toggles (Auto-Syncs to Wix Website)
              </span>
              <p className="text-[11px] text-[#EADBC0] mt-0.5">
                Turn sections ON or OFF below to control exactly what clients &amp; the public see on your website.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => onTogglePublicPreview(!isPublicPreviewActive)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border flex items-center gap-1 cursor-pointer transition-all ${
                  isPublicPreviewActive
                    ? "bg-[#22C55E] text-[#041022] border-[#86EFAC]"
                    : "bg-[#091830] text-[#FFE394] border-[#C5A059]/60 hover:border-[#FFE394]"
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>
                  {isPublicPreviewActive
                    ? "Previewing Public View (Click for Full CRM)"
                    : "Preview Public View Here"}
                </span>
              </button>
              <button
                type="button"
                onClick={handleResetToRecommendedPublic}
                className="px-2.5 py-1.5 rounded-lg bg-[#091830] hover:bg-[#132C54] text-[#FFE394] text-[11px] font-semibold border border-[#C5A059]/60 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Recommended County Only</span>
              </button>
              <button
                type="button"
                onClick={handleTurnAllOn}
                className="px-2.5 py-1.5 rounded-lg bg-[#091830] hover:bg-[#132C54] text-[#EADBC0] text-[11px] font-semibold border border-[#C5A059]/40 cursor-pointer"
              >
                All On
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PUBLIC_SUBPAGE_TOGGLE_METADATA.map((item) => {
              const checked = Boolean(toggles[item.key]);
              return (
                <label
                  key={item.key}
                  data-testid={`public-toggle-${item.key}`}
                  className={`flex items-start justify-between gap-2.5 rounded-xl p-2.5 border transition-all cursor-pointer ${
                    checked
                      ? "bg-[#0B2244] border-[#22C55E]/80 shadow-[0_0_12px_rgba(34,197,94,0.12)]"
                      : "bg-[#07142B]/70 border-[#C5A059]/30 opacity-75 hover:opacity-100"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#FFF8E7]">
                        {item.label}
                      </span>
                      {item.recommendedForPublic ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#064E3B] text-[#6EE7B7] font-bold uppercase">
                          County Info
                        </span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1E293B] text-[#94A3B8] font-semibold uppercase">
                          Advocate Deep Data
                        </span>
                      )}
                    </div>
                    <p className="text-[10.5px] text-[#C6B697] leading-snug mt-0.5">
                      {item.description}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      onUpdateToggles({ [item.key]: e.target.checked })
                    }
                    className="mt-1 h-4 w-4 accent-[#22C55E] rounded cursor-pointer shrink-0"
                  />
                </label>
              );
            })}
          </div>
        </div>

        {/* Optional Default County Toggle + Standalone Preview Link */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#091830] border border-[#C5A059]/45 px-3.5 py-2.5 text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-[#FFF4D4] font-medium">
            <input
              type="checkbox"
              checked={lockDefaultCounty}
              onChange={(e) => setLockDefaultCounty(e.target.checked)}
              className="rounded border-[#C5A059] accent-[#E5C170] h-4 w-4 cursor-pointer"
            />
            <span>
              Start map focused on currently selected county ({selectedCountyName} · FIPS {selectedFips})
            </span>
          </label>
          <a
            href={embedUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[#FFE394] hover:underline font-semibold"
          >
            <span>Open Live Public Sub-Page in New Tab</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* STEP 2: WIX HTML EMBED CODE (RECOMMENDED 1-CLICK COPY) */}
        <div className="rounded-xl bg-[#051126] border border-[#DFBE77]/65 p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#FFE394]">
                <Sparkles className="h-3.5 w-3.5" />
                2. Wix &ldquo;Embed HTML&rdquo; Drop-In Code (Public Sub-Page)
              </span>
              <p className="text-[11px] text-[#EADBC0] mt-0.5">
                In Wix Editor: Click <strong>Add Elements (+)</strong> &rarr; <strong>Embed Code</strong> &rarr; <strong>Embed HTML</strong> &rarr; Paste this code &amp; stretch to full width.
              </p>
            </div>
            <button
              type="button"
              data-testid="copy-wix-html-btn"
              onClick={() =>
                handleCopy("html", wixHtmlIframeSnippet, "Wix HTML Embed Code")
              }
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#FCE6A6] via-[#E5C170] to-[#C59B43] text-[#07162B] font-bold text-xs border border-[#FFF4D4] shadow-[0_4px_12px_rgba(229,193,112,0.35)] hover:brightness-105 flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              {copiedKey === "html" ? (
                <>
                  <Check className="h-4 w-4 text-[#064E3B]" />
                  <span>Copied HTML Code!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy Wix HTML Code</span>
                </>
              )}
            </button>
          </div>
          <pre className="rounded-lg bg-[#020814] border border-[#1E3A6D] p-3 text-[11px] text-[#93C5FD] font-mono overflow-x-auto max-h-36 select-all">
            {wixHtmlIframeSnippet}
          </pre>
        </div>

        {/* STEP 3: WIX VELO PAGE CODE + CLOUDFLARE API HOOK */}
        <div className="rounded-xl bg-[#051126] border border-[#C5A059]/50 p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#FFE394]">
                <Code2 className="h-3.5 w-3.5" />
                3. Wix Velo Page Code ($w.onReady + Direct Cloudflare Fetch)
              </span>
              <p className="text-[11px] text-[#EADBC0] mt-0.5">
                Optional: Turn on <strong>Dev Mode</strong> in Wix and paste into your page code to listen for county clicks or query Cloudflare D1 directly.
              </p>
            </div>
            <button
              type="button"
              data-testid="copy-wix-velo-btn"
              onClick={() =>
                handleCopy("velo", wixVeloPageSnippet, "Wix Velo Page Code")
              }
              className="px-3.5 py-2 rounded-xl bg-[#10284E] hover:bg-[#163566] text-[#FFF8E7] font-bold text-xs border border-[#DFBE77]/75 flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              {copiedKey === "velo" ? (
                <>
                  <Check className="h-4 w-4 text-[#4ADE80]" />
                  <span>Copied Velo Code!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-[#FFE394]" />
                  <span>Copy Wix Velo Code</span>
                </>
              )}
            </button>
          </div>
          <pre className="rounded-lg bg-[#020814] border border-[#1E3A6D] p-3 text-[11px] text-[#E2E8F0] font-mono overflow-x-auto max-h-36 select-all">
            {wixVeloPageSnippet}
          </pre>
        </div>

        {/* STEP 4: DIRECT EMBED URL (FOR WIX "EMBED A SITE" ELEMENT) */}
        <div className="rounded-xl bg-[#051126] border border-[#C5A059]/45 p-3.5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FFE394]">
              <Globe className="h-3.5 w-3.5" />
              4. Direct Website Address (Wix &ldquo;Embed a Site&rdquo; URL)
            </span>
            <p className="text-[11px] font-mono text-[#93C5FD] truncate mt-0.5 select-all">
              {embedUrl}
            </p>
          </div>
          <button
            type="button"
            data-testid="copy-wix-url-btn"
            onClick={() => handleCopy("url", embedUrl, "Direct Cloudflare Embed URL")}
            className="px-3 py-1.5 rounded-lg bg-[#091830] hover:bg-[#132C54] text-[#FFE394] font-semibold text-xs border border-[#C5A059]/65 flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            {copiedKey === "url" ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#4ADE80]" />
                <span>Copied URL!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy URL</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
