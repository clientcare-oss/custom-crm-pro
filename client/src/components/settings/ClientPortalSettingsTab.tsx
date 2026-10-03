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
      <div className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#DFBE77] uppercase tracking-wider">
              Client Portal Environment
            </span>
            <Badge variant="outline" className="bg-[#020A17] text-[#FFE394] border border-[#3A2C18] text-[10px]">
              What Families See
            </Badge>
          </div>
          <h3 className="text-base font-serif font-bold text-[#FFF4D4]">
            Nautical, calm & high-trust experience for parents
          </h3>
          <p className="text-xs text-[#C6B697] max-w-2xl leading-relaxed">
            Families experience an uncluttered, high-contrast interface. All cards and items use your exact midnight blue (<code className="text-[#FFE394] font-mono">#00102F</code>) against the deep nautical page backdrop (<code className="text-[#FFE394] font-mono">#030914</code>).
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <a href="/portal-management">
            <Button size="sm" className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-8 cursor-pointer shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 hover:brightness-105">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Stage Simulator (PG-027)
            </Button>
          </a>
          <a href="/portal" target="_blank" rel="noreferrer">
            <Button size="sm" variant="outline" className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs h-8 cursor-pointer">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5 text-[#DFBE77]" />
              Open Live Portal
            </Button>
          </a>
        </div>
      </div>

      {/* 4 Key Pillar Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:border-[#C5A059]/60 transition-all p-4 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-center text-[#FFE394]">
            <Layers className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-serif font-bold text-[#FFF4D4]">14 Journey Stages</h4>
          <p className="text-xs text-[#C6B697] leading-relaxed">
            From Discovery & Retainer to IEP Meeting and Beyond. Families always see their active milestone.
          </p>
          <a href="/portal-management" className="text-[11px] text-[#DFBE77] font-bold hover:underline inline-block pt-1">
            Manage Stages →
          </a>
        </Card>

        <Card className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:border-[#C5A059]/60 transition-all p-4 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-serif font-bold text-[#FFF4D4]">FERPA Document Vault</h4>
          <p className="text-xs text-[#C6B697] leading-relaxed">
            Safe, encrypted storage for evaluations, PWNs, IEP files, and advocate records in Cloudflare R2.
          </p>
          <span className="text-[10px] text-emerald-400 font-semibold block pt-1">
            ✓ 100% Encrypted & Audited
          </span>
        </Card>

        <Card className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:border-[#C5A059]/60 transition-all p-4 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-center text-[#FFE394]">
            <FileText className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-serif font-bold text-[#FFF4D4]">Parent Action Center</h4>
          <p className="text-xs text-[#C6B697] leading-relaxed">
            Priority checklist items: intake forms, consent signatures, meeting prep, and homework items.
          </p>
          <span className="text-[10px] text-[#DFBE77] font-semibold block pt-1">
            ✓ Real-time completion sync
          </span>
        </Card>

        <Card className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:border-[#C5A059]/60 transition-all p-4 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-center text-[#DFBE77]">
            <Palette className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-serif font-bold text-[#FFF4D4]">Nautical Dark Atmosphere</h4>
          <p className="text-xs text-[#C6B697] leading-relaxed">
            Calming deep navy canvas (<code className="text-xs font-mono text-[#FFE394]">#030914</code>) designed to reduce parental anxiety.
          </p>
          {onOpenColorStudio && (
            <button
              onClick={onOpenColorStudio}
              className="text-[11px] text-[#DFBE77] font-bold hover:underline inline-block pt-1 cursor-pointer"
            >
              View Design Tokens →
            </button>
          )}
        </Card>
      </div>

      {/* Live Interactive Portal Sample Card */}
      <div className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 p-6 text-white space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
        <div className="flex items-center justify-between border-b border-[#3A2C18]/60 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FFE394]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#FFF4D4]">Live Family Portal Preview</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#020A17] text-[#FFE394] border border-[#3A2C18]">
              Nautical Dark Theme
            </span>
          </div>
          <span className="text-xs text-[#A69371] font-mono">Backdrop: #0D1117 · Surface: #161B22</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sample Card 1: Document Vault */}
          <div className="rounded-xl border border-[#3A2C18] bg-[#020A17]/90 p-4 space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-[#FFE394] tracking-wider">Document Vault Box</span>
              <span className="text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                100% Safe & Encrypted
              </span>
            </div>
            <h4 className="text-sm font-serif font-bold text-[#FFF4D4]">2026 Psycho-Educational Evaluation.pdf</h4>
            <p className="text-xs text-[#C6B697]">
              Surface Color: <code className="text-[#FFE394] font-mono">#161B22</code>
            </p>
            <div className="pt-2 border-t border-[#3A2C18]/60 flex items-center justify-between">
              <span className="text-[10px] text-[#A69371]">Updated Today</span>
              <Button size="sm" className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-7 px-3 rounded-lg border border-[#FFE394]/50 cursor-pointer">
                View File
              </Button>
            </div>
          </div>

          {/* Sample Card 2: Action Center */}
          <div className="rounded-xl border border-[#3A2C18] bg-gradient-to-b from-[#071E3D] to-[#020A17] p-4 space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-[#FFE394] tracking-wider">Action Center Item</span>
              <span className="text-[10px] bg-[#FFE394] text-slate-950 px-2 py-0.5 rounded-full font-bold">
                Needs Your Review
              </span>
            </div>
            <h4 className="text-sm font-serif font-bold text-[#FFF4D4]">Parent Priorities & Concerns Statement</h4>
            <p className="text-xs text-[#C6B697]">
              Active Surface: <code className="text-[#FFE394] font-mono">#21262D → #161B22</code>
            </p>
            <div className="pt-2 border-t border-[#3A2C18]/60 flex items-center justify-between">
              <span className="text-[10px] text-[#A69371]">Due in 3 days</span>
              <Button size="sm" className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-7 px-3 rounded-lg border border-[#FFE394]/50 cursor-pointer">
                Review Now →
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Portal Palette Reference */}
      <div className="rounded-xl border border-[#3A2C18] p-4 bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
        <button
          type="button"
          onClick={() => setShowColorDrawer((v) => !v)}
          className="w-full flex items-center justify-between text-xs font-bold text-[#FFF4D4] cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#DFBE77]" />
            <span>Client Portal Color Reference Details</span>
            <Badge variant="outline" className="text-[10px] bg-[#020A17] text-[#FFE394] border border-[#3A2C18]">
              {showColorDrawer ? "Expanded" : "Click to View Swatches"}
            </Badge>
          </div>
          {showColorDrawer ? <ChevronUp className="w-4 h-4 text-[#FFE394]" /> : <ChevronDown className="w-4 h-4 text-[#FFE394]" />}
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
                className="p-3 rounded-xl border border-[#3A2C18] bg-[#020A17] flex items-center gap-3 cursor-pointer hover:border-[#C5A059]/60 transition-all text-xs"
              >
                <div
                  className="w-8 h-8 rounded-lg shrink-0 border border-white/20 shadow-inner"
                  style={{ backgroundColor: item.hex }}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[#FFF4D4] truncate">{item.name}</div>
                  <div className="text-[11px] font-mono text-[#DFBE77] font-semibold">{item.hex}</div>
                  <div className="text-[10px] text-[#A69371] truncate">{item.desc}</div>
                </div>
                <Copy className="w-3.5 h-3.5 text-[#A69371] shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
