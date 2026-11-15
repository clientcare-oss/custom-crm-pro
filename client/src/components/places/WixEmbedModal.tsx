import React, { useState } from "react";
import { Check, Code2, Copy, ExternalLink, Globe, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

interface WixEmbedModalProps {
  open: boolean;
  onClose: () => void;
  selectedFips: string;
  selectedCountyName: string;
}

const CLOUDFLARE_PRODUCTION_ORIGIN = "https://custom-crm-pro.clientcare-fa6.workers.dev";

export function WixEmbedModal({
  open,
  onClose,
  selectedFips,
  selectedCountyName,
}: WixEmbedModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [lockDefaultCounty, setLockDefaultCounty] = useState(false);

  if (!open) return null;

  const embedUrl = lockDefaultCounty
    ? `${CLOUDFLARE_PRODUCTION_ORIGIN}/waypoint-places?embed=1&fips=${selectedFips}`
    : `${CLOUDFLARE_PRODUCTION_ORIGIN}/waypoint-places?embed=1`;

  const wixHtmlIframeSnippet = `<!-- Waypoint Places — 50-State Relocation & IEP Explorer (Cloudflare Live Embed) -->
<div style="width:100%;max-width:100%;margin:0 auto;background:#07162B;border-radius:16px;overflow:hidden;border:2px solid #C5A059;box-shadow:0 16px 40px rgba(0,0,0,0.65);">
  <iframe
    id="waypoint-places-iframe"
    src="${embedUrl}"
    title="Waypoint Places — 50-State Special Education & Community Explorer"
    style="width:100%;height:1280px;border:0;display:block;background:#07162B;"
    allow="fullscreen; clipboard-write; geolocation"
    loading="lazy"
  ></iframe>
</div>
<script>
  window.addEventListener("message", function (event) {
    if (!event.data || typeof event.data !== "object") return;
    if (event.data.type === "WAYPOINT_PLACES_RESIZE" && event.data.height) {
      var frame = document.getElementById("waypoint-places-iframe");
      if (frame) frame.style.height = Math.max(960, Number(event.data.height)) + "px";
    }
  });
</script>`;

  const wixVeloPageSnippet = `// ============================================================================
// WIX VELO PAGE CODE — Waypoint Places (Connected to Cloudflare Worker + D1)
// 1. In Wix Editor, add an "Embed HTML" element and set its ID to: #html1
// 2. Paste the HTML Embed Code above into #html1 (or set #html1.src in Velo below)
// ============================================================================
import { fetch } from 'wix-fetch';

const CLOUDFLARE_WORKER_URL = "${CLOUDFLARE_PRODUCTION_ORIGIN}";

$w.onReady(function () {
  // Listen for county clicks inside the embedded Waypoint Places map
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

// Optional: Fetch live county U.S. Census + School District + Therapy data directly
// from your Cloudflare Worker inside Wix Velo for custom Wix repeaters or dynamic pages
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

  return (
    <div
      data-testid="wix-embed-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl bg-gradient-to-b from-[#0A1D3B] via-[#07152C] to-[#040D1E] border-2 border-[#DFBE77] p-5 sm:p-6 text-[#FFF8E7] shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_30px_rgba(223,190,119,0.22)] space-y-5 my-auto max-h-[92vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#C5A059]/40 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-b from-[#FFE394] to-[#C59B43] text-[#07162B] flex items-center justify-center shadow-md shrink-0">
              <Code2 className="h-5 w-5" />
            </div>
            <div>
              <h2
                className="text-lg sm:text-xl font-bold text-[#FFF8E7]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Embed Waypoint Places on Your Website (Wix / Wix Velo)
              </h2>
              <p className="text-xs text-[#EADBC0]">
                Drop this directly onto your Wix site — pulls 100% live from your Cloudflare Worker &amp; D1 database.
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

        {/* Optional Default County Toggle */}
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
            <span>Preview Standalone Embed</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* STEP 1: WIX HTML EMBED CODE (RECOMMENDED 1-CLICK COPY) */}
        <div className="rounded-xl bg-[#051126] border border-[#DFBE77]/65 p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#22C55E]">
                <Sparkles className="h-3.5 w-3.5" />
                Option 1 (Easiest): Wix &ldquo;Embed HTML&rdquo; Drop-In Code
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
          <pre className="rounded-lg bg-[#020814] border border-[#1E3A6D] p-3 text-[11px] text-[#93C5FD] font-mono overflow-x-auto max-h-40 select-all">
            {wixHtmlIframeSnippet}
          </pre>
        </div>

        {/* STEP 2: WIX VELO PAGE CODE + CLOUDFLARE API HOOK */}
        <div className="rounded-xl bg-[#051126] border border-[#C5A059]/50 p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#FFE394]">
                <Code2 className="h-3.5 w-3.5" />
                Option 2: Wix Velo Page Code ($w.onReady + Direct Cloudflare Fetch)
              </span>
              <p className="text-[11px] text-[#EADBC0] mt-0.5">
                Turn on <strong>Dev Mode</strong> in Wix and paste into your page code to listen for county clicks or query Cloudflare D1 directly.
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
          <pre className="rounded-lg bg-[#020814] border border-[#1E3A6D] p-3 text-[11px] text-[#E2E8F0] font-mono overflow-x-auto max-h-44 select-all">
            {wixVeloPageSnippet}
          </pre>
        </div>

        {/* STEP 3: DIRECT EMBED URL (FOR WIX "EMBED A SITE" ELEMENT) */}
        <div className="rounded-xl bg-[#051126] border border-[#C5A059]/45 p-3.5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FFE394]">
              <Globe className="h-3.5 w-3.5" />
              Option 3: Direct Website Address (Wix &ldquo;Embed a Site&rdquo; URL)
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

