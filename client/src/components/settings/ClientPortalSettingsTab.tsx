import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Laptop,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  FileText,
  CheckCircle2,
  Lock,
  Layers,
  Palette,
  Eye,
  ChevronDown,
  ChevronUp,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

interface ClientPortalSettingsTabProps {
  onOpenColorStudio?: () => void;
}

export function ClientPortalSettingsTab({ onOpenColorStudio }: ClientPortalSettingsTabProps) {
  const [showColorDrawer, setShowColorDrawer] = useState(false);

  const copyToClipboard = (hex: string, name: string) => {
    navigator.clipboard.writeText(hex);
    toast.success(`Copied ${hex} (${name}) to clipboard`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-r from-sky-950/40 via-[#00102F]/70 to-sky-900/20 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-sky-300 uppercase tracking-wider">
              Client Portal Environment
            </span>
            <Badge variant="outline" className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-[10px]">
              What Families See
            </Badge>
          </div>
          <h3 className="text-base font-bold text-white">
            Nautical, calm & high-trust experience for parents
          </h3>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Families experience an uncluttered, high-contrast interface. All cards and items use your exact midnight blue (<code className="text-amber-300 font-mono">#00102F</code>) against the deep nautical page backdrop (<code className="text-amber-300 font-mono">#030914</code>).
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <a href="/portal-management">
            <Button size="sm" className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs h-8 cursor-pointer shadow-sm">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Stage Simulator (PG-027)
            </Button>
          </a>
          <a href="/portal" target="_blank" rel="noreferrer">
            <Button size="sm" variant="outline" className="text-xs h-8 text-white border-white/20 hover:bg-white/10 cursor-pointer">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Open Live Portal
            </Button>
          </a>
        </div>
      </div>

      {/* 4 Key Pillar Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border border-border shadow-sm p-4 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400">
            <Layers className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-foreground">14 Journey Stages</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            From Discovery & Retainer to IEP Meeting and Beyond. Families always see their active milestone.
          </p>
          <a href="/portal-management" className="text-[11px] text-primary font-bold hover:underline inline-block pt-1">
            Manage Stages →
          </a>
        </Card>

        <Card className="rounded-2xl border border-border shadow-sm p-4 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-foreground">FERPA Document Vault</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Safe, encrypted storage for evaluations, PWNs, IEP files, and advocate records in Cloudflare R2.
          </p>
          <span className="text-[10px] text-emerald-500 font-semibold block pt-1">
            ✓ 100% Encrypted & Audited
          </span>
        </Card>

        <Card className="rounded-2xl border border-border shadow-sm p-4 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500">
            <FileText className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-foreground">Parent Action Center</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Priority checklist items: intake forms, consent signatures, meeting prep, and homework items.
          </p>
          <span className="text-[10px] text-amber-500 font-semibold block pt-1">
            ✓ Real-time completion sync
          </span>
        </Card>

        <Card className="rounded-2xl border border-border shadow-sm p-4 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400">
            <Palette className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-foreground">Nautical Dark Atmosphere</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Calming deep navy canvas (<code className="text-xs font-mono">#030914</code>) designed to reduce parental anxiety.
          </p>
          {onOpenColorStudio && (
            <button
              onClick={onOpenColorStudio}
              className="text-[11px] text-purple-500 font-bold hover:underline inline-block pt-1 cursor-pointer"
            >
              View Design Tokens →
            </button>
          )}
        </Card>
      </div>

      {/* Live Interactive Portal Sample Card */}
      <div className="rounded-2xl border border-white/10 bg-[#0D1117] p-6 text-white space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">Live Family Portal Preview</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30">
              Nautical Dark Theme
            </span>
          </div>
          <span className="text-xs text-white/50 font-mono">Backdrop: #0D1117 · Surface: #161B22</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sample Card 1: Document Vault */}
          <div className="rounded-xl border border-white/10 bg-[#161B22] p-4 space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Document Vault Box</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                100% Safe & Encrypted
              </span>
            </div>
            <h4 className="text-sm font-bold text-white">2026 Psycho-Educational Evaluation.pdf</h4>
            <p className="text-xs text-white/60">
              Surface Color: <code className="text-amber-300 font-mono">#161B22</code>
            </p>
            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <span className="text-[10px] text-white/40">Updated Today</span>
              <Button size="sm" className="bg-amber-400 hover:bg-amber-500 text-[#161B22] font-bold text-xs h-7 px-3 rounded-lg cursor-pointer">
                View File
              </Button>
            </div>
          </div>

          {/* Sample Card 2: Action Center */}
          <div className="rounded-xl border border-amber-400/40 bg-gradient-to-b from-[#21262D] to-[#161B22] p-4 space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">Action Center Item</span>
              <span className="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-bold">
                Needs Your Review
              </span>
            </div>
            <h4 className="text-sm font-bold text-white">Parent Priorities & Concerns Statement</h4>
            <p className="text-xs text-white/70">
              Active Surface: <code className="text-amber-300 font-mono">#21262D → #161B22</code>
            </p>
            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <span className="text-[10px] text-white/40">Due in 3 days</span>
              <Button size="sm" className="bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-xs h-7 px-3 rounded-lg cursor-pointer">
                Review Now →
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Portal Palette Reference (Tucked away, not overwhelming) */}
      <div className="rounded-2xl border border-border p-4 bg-muted/20">
        <button
          type="button"
          onClick={() => setShowColorDrawer((v) => !v)}
          className="w-full flex items-center justify-between text-xs font-bold text-foreground cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            <span>Client Portal Color Reference Details</span>
            <Badge variant="outline" className="text-[10px]">
              {showColorDrawer ? "Expanded" : "Click to View Swatches"}
            </Badge>
          </div>
          {showColorDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showColorDrawer && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-4 animate-in fade-in">
            {[
              { name: "Portal Dark Canvas", hex: "#0D1117", desc: "Main viewport backdrop" },
              { name: "Portal Surface Card", hex: "#161B22", desc: "Cards, containers, boxes" },
              { name: "Portal Top Header", hex: "#06172F", desc: "Sextant navigation bar" },
              { name: "Elevated Active Surface", hex: "#21262D", desc: "Focused action items" },
              { name: "Waypoint Gold Accent", hex: "#F5B544", desc: "Buttons & milestones" },
              { name: "FERPA Emerald", hex: "#10B981", desc: "Security & compliance tags" },
            ].map((item) => (
              <div
                key={item.hex + item.name}
                onClick={() => copyToClipboard(item.hex, item.name)}
                className="p-3 rounded-xl border border-border bg-card flex items-center gap-3 cursor-pointer hover:border-primary transition-all text-xs"
              >
                <div
                  className="w-8 h-8 rounded-lg shrink-0 border border-white/20 shadow-inner"
                  style={{ backgroundColor: item.hex }}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-foreground truncate">{item.name}</div>
                  <div className="text-[11px] font-mono text-primary font-semibold">{item.hex}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{item.desc}</div>
                </div>
                <Copy className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
