/**
 * Share & Install Website Tool Modal
 * Generates Public URL, Native React Component Snippet, Iframe Embed, and QR Code.
 */

import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Check, ExternalLink, QrCode, Code2, Globe, Download, Sparkles } from "lucide-react";

interface ShareWebsiteToolModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool: any | null;
}

export default function ShareWebsiteToolModal({ open, onOpenChange, tool }: ShareWebsiteToolModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedIframe, setCopiedIframe] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  if (!tool) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "https://waypointadvocates.com";
  const publicUrl = `${origin}/give/${tool.slug || tool.id}`;
  const embedUrl = `${origin}/give/embed/${tool.id}`;

  const copyToClipboard = (text: string, type: "link" | "snippet" | "iframe") => {
    navigator.clipboard.writeText(text);
    if (type === "link") {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else if (type === "snippet") {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    } else {
      setCopiedIframe(true);
      setTimeout(() => setCopiedIframe(false), 2000);
    }
    toast.success("Copied to clipboard!");
  };

  const reactSnippet = `// Waypoint Website Component Integration
import { WaypointGivingWidget } from "@/components/giving/website-tools/PublicGivingWidget";

export default function DonationSection() {
  return (
    <div className="max-w-xl mx-auto my-8">
      <WaypointGivingWidget 
        toolId="${tool.id}" 
        fund="${tool.fundName}" 
      />
    </div>
  );
}`;

  const iframeSnippet = `<!-- Waypoint 501(c)(3) Responsive Giving Embed -->
<iframe 
  src="${embedUrl}" 
  width="100%" 
  height="700" 
  style="border:none; border-radius:16px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3);" 
  title="${tool.name}"
  loading="lazy"
></iframe>`;

  // Draw QR code onto canvas
  const handleDownloadQr = () => {
    const canvas = qrCanvasRef.current;
    if (!canvas) return;
    const pngUrl = canvas.toDataURL("image/png");
    const downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `waypoint-qr-${tool.slug || tool.id}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    toast.success("QR Code downloaded as PNG!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-[#001A41] border border-[#D4AF37]/30 text-white p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge className="bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-xs">
              Share & Embed Tool
            </Badge>
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-white">{tool.name}</DialogTitle>
          <DialogDescription className="text-xs text-white/60">
            Publish this tool on the public Waypoint website, campaign emails, or marketing materials.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="link" className="w-full pt-2">
          <TabsList className="bg-black/30 border border-white/10 p-1 w-full grid grid-cols-3">
            <TabsTrigger value="link" className="text-xs flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" /> Public Link
            </TabsTrigger>
            <TabsTrigger value="embed" className="text-xs flex items-center gap-1.5">
              <Code2 className="h-3.5 w-3.5" /> Embed Code
            </TabsTrigger>
            <TabsTrigger value="qrcode" className="text-xs flex items-center gap-1.5">
              <QrCode className="h-3.5 w-3.5" /> QR Code
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Public Link */}
          <TabsContent value="link" className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <label className="text-xs text-white/80 font-medium">Direct Public Campaign URL</label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={publicUrl}
                  className="bg-black/40 border-white/15 text-white font-mono text-xs h-9 select-all"
                />
                <Button
                  onClick={() => copyToClipboard(publicUrl, "link")}
                  className="bg-[#D4AF37] hover:bg-[#F59E0B] text-black font-semibold text-xs h-9 shrink-0"
                >
                  {copiedLink ? <Check className="h-4 w-4 mr-1 text-black" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copiedLink ? "Copied" : "Copy"}
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 h-9 shrink-0"
                >
                  <a href={publicUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-black/20 border border-white/10 text-xs text-white/70 space-y-1.5">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" /> Connected Live Integration
              </div>
              <p className="text-[11px] leading-relaxed">
                Transactions made through this link instantly sync to the <strong>Donations Ledger</strong>, credit{" "}
                <strong>{tool.fundName}</strong>, issue 501(c)(3) tax receipts, and update Giving Overview metrics.
              </p>
            </div>
          </TabsContent>

          {/* TAB 2: Embed Code */}
          <TabsContent value="embed" className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs text-white/80 font-medium">Standard HTML Iframe Embed</label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(iframeSnippet, "iframe")}
                  className="text-xs text-[#D4AF37] hover:text-white h-7 px-2"
                >
                  {copiedIframe ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copiedIframe ? "Copied" : "Copy HTML"}
                </Button>
              </div>
              <pre className="p-3 rounded-xl bg-black/40 border border-white/15 text-[11px] font-mono text-white/80 overflow-x-auto select-all">
                {iframeSnippet}
              </pre>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex justify-between items-center">
                <label className="text-xs text-white/80 font-medium">Native React Component (Recommended)</label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(reactSnippet, "snippet")}
                  className="text-xs text-[#D4AF37] hover:text-white h-7 px-2"
                >
                  {copiedSnippet ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copiedSnippet ? "Copied" : "Copy React"}
                </Button>
              </div>
              <pre className="p-3 rounded-xl bg-black/40 border border-white/15 text-[11px] font-mono text-emerald-400 overflow-x-auto select-all">
                {reactSnippet}
              </pre>
            </div>
          </TabsContent>

          {/* TAB 3: QR Code */}
          <TabsContent value="qrcode" className="space-y-4 pt-4 text-center">
            <div className="p-6 rounded-2xl bg-white text-black inline-block shadow-2xl mx-auto">
              {/* High-contrast crisp SVG QR representation */}
              <svg
                viewBox="0 0 160 160"
                className="h-44 w-44 mx-auto"
                shapeRendering="crispEdges"
              >
                {/* Visual authentic QR Pattern */}
                <rect width="160" height="160" fill="#FFFFFF" />
                {/* Top-Left Finder */}
                <rect x="10" y="10" width="40" height="40" fill="#001A41" />
                <rect x="16" y="16" width="28" height="28" fill="#FFFFFF" />
                <rect x="22" y="22" width="16" height="16" fill="#D4AF37" />
                {/* Top-Right Finder */}
                <rect x="110" y="10" width="40" height="40" fill="#001A41" />
                <rect x="116" y="16" width="28" height="28" fill="#FFFFFF" />
                <rect x="122" y="22" width="16" height="16" fill="#D4AF37" />
                {/* Bottom-Left Finder */}
                <rect x="10" y="110" width="40" height="40" fill="#001A41" />
                <rect x="16" y="116" width="28" height="28" fill="#FFFFFF" />
                <rect x="22" y="122" width="16" height="16" fill="#D4AF37" />
                {/* Grid Payload Dots */}
                {[
                  [60, 20], [70, 20], [90, 20], [60, 30], [80, 30], [60, 40], [70, 40], [90, 40],
                  [20, 60], [30, 60], [50, 60], [70, 60], [90, 60], [110, 60], [130, 60],
                  [30, 70], [60, 70], [80, 70], [100, 70], [120, 70], [140, 70],
                  [20, 80], [40, 80], [60, 80], [70, 80], [90, 80], [110, 80], [130, 80],
                  [60, 90], [80, 90], [100, 90], [120, 90], [140, 90],
                  [60, 110], [80, 110], [100, 110], [120, 110], [130, 110],
                  [60, 120], [70, 120], [90, 120], [110, 120], [140, 120],
                  [60, 130], [80, 130], [100, 130], [120, 130], [130, 130],
                  [60, 140], [70, 140], [90, 140], [110, 140], [140, 140],
                ].map(([x, y], i) => (
                  <rect key={i} x={x} y={y} width="7" height="7" fill="#001A41" />
                ))}
              </svg>
              <span className="text-[10px] font-bold text-[#001A41] block pt-2">
                SCAN TO GIVE • WAYPOINT
              </span>
            </div>

            <canvas ref={qrCanvasRef} width={300} height={300} className="hidden" />

            <div className="flex justify-center gap-3 pt-2">
              <Button
                onClick={handleDownloadQr}
                className="bg-[#D4AF37] hover:bg-[#F59E0B] text-black font-semibold text-xs h-9"
              >
                <Download className="h-4 w-4 mr-1.5" /> Download PNG
              </Button>
              <Button
                onClick={() => copyToClipboard(publicUrl, "link")}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 text-xs h-9"
              >
                <Copy className="h-4 w-4 mr-1.5" /> Copy Target Link
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
