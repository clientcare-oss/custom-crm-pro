/**
 * Public Giving Tool Page — PG-040-PUB
 * Public-facing standalone page for campaigns, donation forms, and widgets.
 * Accessible via /give/:slug and /give/embed/:id
 */

import React from "react";
import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import PublicGivingWidget from "@/components/giving/website-tools/PublicGivingWidget";
import PageIdBadge from "@/components/PageIdBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Heart, ArrowLeft, Landmark } from "lucide-react";

export default function PublicGivingPage() {
  const [matchSlug, paramsSlug] = useRoute("/give/:slug");
  const [matchEmbed, paramsEmbed] = useRoute("/give/embed/:id");

  const slugOrId = paramsSlug?.slug || paramsEmbed?.id || "rise-and-thrive";
  const isEmbed = !!matchEmbed;

  const { data: tool, isLoading, error } = trpc.giving.getWebsiteTool.useQuery(
    { idOrSlug: slugOrId },
    { enabled: !!slugOrId }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#07162B] flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-white/60">Loading Waypoint Giving Portal...</p>
        </div>
      </div>
    );
  }

  if (error || !tool) {
    return (
      <div className="min-h-screen bg-[#07162B] flex items-center justify-center text-white p-4">
        <div className="max-w-md text-center space-y-4 p-8 rounded-3xl bg-[#001A41] border border-white/10 shadow-2xl">
          <div className="h-12 w-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <Shield className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Campaign or Tool Not Found</h2>
          <p className="text-xs text-white/60">
            The requested fundraising campaign or donation tool may have been archived or moved.
          </p>
          <Button asChild className="bg-[#D4AF37] text-black font-semibold text-xs">
            <Link href="/giving">Return to Giving Overview</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Pure Embed Mode (used in external iframes)
  if (isEmbed) {
    return (
      <div className="min-h-screen bg-transparent p-2 md:p-4 flex items-center justify-center">
        <div className="w-full max-w-xl">
          <PublicGivingWidget tool={tool} isEmbed={true} />
        </div>
      </div>
    );
  }

  // Standalone Public Page Mode
  return (
    <div className="min-h-screen bg-[#07162B] text-white flex flex-col justify-between">
      {/* Public Branded Top Nav */}
      <header className="border-b border-white/10 bg-[#001A41]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B38F24] p-1.5 flex items-center justify-center text-black font-extrabold shadow-md shadow-[#D4AF37]/20">
              ⚓
            </div>
            <div>
              <div className="font-bold text-sm md:text-base text-white tracking-tight flex items-center gap-2">
                Waypoint Advocates
                <Badge className="bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-[10px] hidden sm:inline-flex">
                  501(c)(3) Public Charity
                </Badge>
              </div>
              <span className="text-[10px] text-white/50 block">Georgia IEP Family Giving & Advocacy Fund</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <PageIdBadge id="PG-040-PUB" name="Public Giving Tool" />
            <div className="text-xs text-white/60 flex items-center gap-1.5 hidden md:flex">
              <Lock className="h-3.5 w-3.5 text-emerald-400" />
              <span>256-Bit Encrypted</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8 py-8 md:py-12">
        <PublicGivingWidget tool={tool} isEmbed={false} />
      </main>

      {/* Public Footer */}
      <footer className="border-t border-white/10 bg-[#001A41]/60 py-8 text-center text-xs text-white/50 space-y-2">
        <div className="max-w-4xl mx-auto px-4 space-y-1.5">
          <div className="flex items-center justify-center gap-2 text-white/70 font-medium">
            <Landmark className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span>Waypoint Foundation Inc. • EIN 58-7492014</span>
          </div>
          <p className="text-[11px] text-white/40 max-w-2xl mx-auto leading-relaxed">
            Waypoint Foundation Inc. is a registered 501(c)(3) public charity. Contributions are fully tax-deductible
            to the extent permitted by law. No goods or services were provided in exchange for this contribution.
          </p>
          <div className="pt-2 text-[10px] text-white/30">
            © {new Date().getFullYear()} Waypoint Advocates. Master IEP Coach® is a registered trademark of Catherine Whitcher, LLC.
          </div>
        </div>
      </footer>
    </div>
  );
}
