/**
 * Website Tools Overview Page — PG-040-WEB
 * Create and manage donation forms, campaign pages, buttons, progress bars, and shareable fundraising tools.
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import PageIdBadge from "@/components/PageIdBadge";
import GivingPageLayout from "@/components/giving/GivingPageLayout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Globe,
  Plus,
  Search,
  FileText,
  MousePointerClick,
  Layers,
  BarChart2,
  Megaphone,
  UserPlus,
  Eye,
  Pencil,
  Copy,
  Code2,
  MoreVertical,
  Landmark,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Archive,
  Trash2,
  Sparkles,
  ExternalLink,
  DollarSign,
  TrendingUp,
  Share2,
  Heart,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import CreateEditWebsiteToolModal from "@/components/giving/website-tools/CreateEditWebsiteToolModal";
import WebsiteToolPreviewModal from "@/components/giving/website-tools/WebsiteToolPreviewModal";
import ShareWebsiteToolModal from "@/components/giving/website-tools/ShareWebsiteToolModal";

const TYPE_ICONS: Record<string, any> = {
  donation_form: FileText,
  donate_button: MousePointerClick,
  floating_button: Layers,
  progress_bar: BarChart2,
  campaign_page: Megaphone,
  supporter_signup: UserPlus,
};

const TYPE_LABELS: Record<string, string> = {
  donation_form: "Donation Form",
  donate_button: "Donate Button",
  floating_button: "Floating Button",
  progress_bar: "Goal / Progress Bar",
  campaign_page: "Campaign Page",
  supporter_signup: "Supporter Signup",
};

/**
 * Compact visual miniature preview of each website widget type so users can see
 * what the widget looks like directly on the card at 100% zoom.
 */
function MiniWidgetPreview({
  tool,
  onClick,
}: {
  tool: any;
  onClick: () => void;
}) {
  const settings = tool.settings || {};
  const suggestedAmounts: number[] = settings.suggestedAmounts || [2500, 5000, 10000, 25000];
  const raisedCents = tool.amountRaisedCents || 0;
  const goalCents = settings.goalAmountCents || tool.goalAmountCents || 2500000;
  const raisedDollars = Math.round(raisedCents / 100);
  const goalDollars = Math.round(goalCents / 100);
  const pct = Math.min(100, Math.max(8, Math.round((raisedCents / goalCents) * 100)));
  const ctaText = settings.buttonText || tool.ctaText || "Donate Now";

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="group/preview relative rounded-xl border border-[#3A2C18] bg-[#020916] overflow-hidden cursor-pointer hover:border-[#C5A059]/80 transition-all shadow-inner"
      title="Click to open full interactive widget preview"
    >
      {/* Miniature Browser Top Bar */}
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#041022] border-b border-[#3A2C18]/70">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="h-2 w-2 rounded-full bg-rose-500/70 shrink-0" />
          <span className="h-2 w-2 rounded-full bg-amber-400/70 shrink-0" />
          <span className="h-2 w-2 rounded-full bg-emerald-400/70 shrink-0" />
          <span className="ml-1 text-[9px] font-mono text-[#A69371] truncate">
            waypointadvocates.com/give/{tool.slug || tool.id}
          </span>
        </div>
        <span className="text-[9px] font-semibold text-[#FAD77B] opacity-80 group-hover/preview:opacity-100 flex items-center gap-1 shrink-0">
          <Eye className="h-2.5 w-2.5" />
          <span>Live Preview</span>
        </span>
      </div>

      {/* Widget Canvas Body */}
      <div className="p-2.5 bg-gradient-to-b from-[#071A36]/75 to-[#030C1A] min-h-[128px] flex flex-col justify-center">
        {tool.type === "donation_form" && (
          <div className="rounded-lg border border-[#C5A059]/35 bg-[#05142B]/95 p-2.5 space-y-2 shadow-md">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#C5A059]/20 text-[#FFE394] border border-[#C5A059]/30">
                501(c)(3) Form
              </span>
              <span className="text-[8px] text-[#A69371] flex items-center gap-0.5">
                <Lock className="h-2 w-2 text-emerald-400" /> Stripe
              </span>
            </div>
            <div className="text-[11px] font-serif font-bold text-[#FFF4D4] truncate">
              {tool.headline || tool.name}
            </div>
            <div className="grid grid-cols-4 gap-1">
              {suggestedAmounts.slice(0, 4).map((cents: number, idx: number) => (
                <div
                  key={cents}
                  className={`py-1 rounded text-center text-[9px] font-bold border ${
                    idx === 1
                      ? "bg-gradient-to-r from-[#DFBE77] to-[#C5A059] text-[#07162B] border-[#FFE394]"
                      : "bg-[#020A17] text-[#D8C7A5] border-[#3A2C18]"
                  }`}
                >
                  ${Math.round(cents / 100)}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1">
              <div className="h-4 rounded bg-[#020A17] border border-[#3A2C18]/80 px-1.5 flex items-center text-[8px] text-[#A69371]">
                Your Name
              </div>
              <div className="h-4 rounded bg-[#020A17] border border-[#3A2C18]/80 px-1.5 flex items-center text-[8px] text-[#A69371]">
                Email for Receipt
              </div>
            </div>
            <div className="w-full py-1 rounded bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-[9px] text-center shadow-sm">
              {ctaText}
            </div>
          </div>
        )}

        {tool.type === "donate_button" && (
          <div className="rounded-lg border border-[#3A2C18] bg-[#041022]/90 p-3 flex flex-col items-center justify-center gap-2 text-center">
            <div className="w-3/4 h-1.5 rounded-full bg-white/10" />
            <div className="w-1/2 h-1.5 rounded-full bg-white/10 mb-1" />
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs shadow-[0_4px_14px_rgba(197,160,89,0.4)] border border-[#FFE394]">
              <Heart className="h-3 w-3 fill-[#07162B]" />
              <span>{ctaText}</span>
            </div>
            <span className="text-[9px] text-[#A69371]">
              Embeddable button · Launches instant gift checkout
            </span>
          </div>
        )}

        {tool.type === "floating_button" && (
          <div className="relative rounded-lg border border-[#3A2C18] bg-[#041022]/90 p-3 h-[108px] flex flex-col justify-between overflow-hidden">
            <div className="space-y-1.5 opacity-40">
              <div className="w-1/3 h-2 rounded bg-[#C5A059]/40" />
              <div className="w-full h-1.5 rounded bg-white/15" />
              <div className="w-5/6 h-1.5 rounded bg-white/15" />
              <div className="w-2/3 h-1.5 rounded bg-white/15" />
            </div>
            <div className="self-end inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-[10px] shadow-[0_4px_16px_rgba(197,160,89,0.5)] border border-[#FFE394]">
              <Heart className="h-2.5 w-2.5 fill-[#07162B]" />
              <span>{ctaText}</span>
            </div>
          </div>
        )}

        {tool.type === "progress_bar" && (
          <div className="rounded-lg border border-[#C5A059]/35 bg-[#05142B]/95 p-2.5 space-y-2 shadow-md">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-serif font-bold text-[#FFF4D4] truncate">
                {tool.headline || tool.name}
              </span>
              <span className="text-[9px] font-mono font-bold text-emerald-400 shrink-0">
                {pct}%
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-[#020A17] border border-[#3A2C18] overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-[#DFBE77] to-[#C5A059]"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[9px]">
              <span className="font-mono font-bold text-emerald-400">
                ${raisedDollars.toLocaleString()} raised
              </span>
              <span className="font-mono text-[#A69371]">
                Goal: ${goalDollars.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {tool.type === "campaign_page" && (
          <div className="rounded-lg border border-[#C5A059]/35 bg-[#05142B]/95 p-2.5 grid grid-cols-5 gap-2 items-center shadow-md">
            <div className="col-span-3 space-y-1.5">
              <span className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Campaign Page
              </span>
              <div className="text-[10px] font-serif font-bold text-[#FFF4D4] line-clamp-1">
                {tool.headline || tool.name}
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#020A17] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-[#C5A059]"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-[8px] font-mono text-[#C6B697]">
                ${raisedDollars.toLocaleString()} / ${goalDollars.toLocaleString()}
              </div>
            </div>
            <div className="col-span-2 rounded bg-[#020A17]/90 border border-[#3A2C18] p-1.5 space-y-1">
              <div className="grid grid-cols-2 gap-0.5">
                <div className="text-[8px] text-center py-0.5 rounded bg-[#07162B] text-[#D8C7A5]">$50</div>
                <div className="text-[8px] text-center py-0.5 rounded bg-[#C5A059] text-[#07162B] font-bold">$100</div>
              </div>
              <div className="w-full py-0.5 rounded bg-gradient-to-r from-[#DFBE77] to-[#C5A059] text-[#07162B] font-bold text-[8px] text-center truncate px-1">
                {ctaText}
              </div>
            </div>
          </div>
        )}

        {tool.type === "supporter_signup" && (
          <div className="rounded-lg border border-[#C5A059]/35 bg-[#05142B]/95 p-2.5 space-y-1.5 shadow-md">
            <div className="text-[10px] font-serif font-bold text-[#FFF4D4] truncate">
              {tool.headline || "Join Our IEP Advocacy Supporter Network"}
            </div>
            <div className="grid grid-cols-2 gap-1">
              <div className="h-4 rounded bg-[#020A17] border border-[#3A2C18] px-1.5 flex items-center text-[8px] text-[#A69371]">
                Full Name
              </div>
              <div className="h-4 rounded bg-[#020A17] border border-[#3A2C18] px-1.5 flex items-center text-[8px] text-[#A69371]">
                Email Address
              </div>
            </div>
            <div className="w-full py-1 rounded bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-[9px] text-center">
              {tool.ctaText || "Join the Movement"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WebsiteToolsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [toolToEdit, setToolToEdit] = useState<any | null>(null);

  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [toolToPreview, setToolToPreview] = useState<any | null>(null);

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [toolToShare, setToolToShare] = useState<any | null>(null);

  const utils = trpc.useUtils();
  const { data: tools = [], isLoading } = trpc.giving.listWebsiteTools.useQuery({
    type: typeFilter,
    status: statusFilter,
    search: search || undefined,
  });

  const deleteToolMutation = trpc.giving.deleteWebsiteTool.useMutation({
    onSuccess: () => {
      toast.success("Website tool deleted");
      utils.giving.listWebsiteTools.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to delete tool"),
  });

  const updateToolMutation = trpc.giving.updateWebsiteTool.useMutation({
    onSuccess: () => {
      toast.success("Tool status updated");
      utils.giving.listWebsiteTools.invalidate();
    },
  });

  // Calculate summary metrics
  const activeCount = tools.filter((t) => t.status === "active").length;
  const totalRaisedCents = tools.reduce((sum, t) => sum + (t.amountRaisedCents || 0), 0);
  const totalDonationsCount = tools.reduce((sum, t) => sum + (t.donationsGeneratedCount || 0), 0);

  const handleCopyLink = (tool: any) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://waypointadvocates.com";
    const url = `${origin}/give/${tool.slug || tool.id}`;
    navigator.clipboard.writeText(url);
    toast.success(`Copied link for ${tool.name}!`);
  };

  const handleToggleStatus = (tool: any) => {
    const nextStatus = tool.status === "active" ? "archived" : "active";
    updateToolMutation.mutate({
      id: tool.id,
      status: nextStatus,
    });
  };

  return (
    <GivingPageLayout>
      {/* ── Sub-Header: Waypoint Navy Plaque Sub-Bar with Actions ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-[#05142B]/90 border border-[#3A2C18] shadow-[0_6px_20px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.08)]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0B2144] border border-[#C5A059]/40 flex items-center justify-center text-[#FAD77B] shadow-inner">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 
                  className="text-xl md:text-2xl font-bold tracking-wide text-[#FFF4D4]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Website Tools
                </h2>
                <PageIdBadge id="PG-040-WEB" name="Website Tools" />
              </div>
              <p className="text-xs text-[#C6B697]">
                Create donation forms, campaign pages, buttons, progress bars, and shareable fundraising tools for the
                Waypoint website.
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => {
            setToolToEdit(null);
            setCreateModalOpen(true);
          }}
          className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-bold text-xs h-9 px-4 gap-1.5 shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 cursor-pointer self-start md:self-auto"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Create Website Tool</span>
        </Button>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="p-4 bg-[#05142B]/90 border border-[#3A2C18] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:border-[#C5A059]/60 transition-all">
          <span className="text-xs text-[#C6B697] block">Active Tools</span>
          <span 
            className="text-2xl font-bold text-[#FFF4D4] mt-1 block"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {activeCount}
          </span>
          <span className="text-[10px] text-emerald-400 mt-1 block font-medium">Live on Public Website</span>
        </Card>
        <Card className="p-4 bg-[#05142B]/90 border border-[#3A2C18] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:border-[#C5A059]/60 transition-all">
          <span className="text-xs text-[#C6B697] block">Web Gifts Generated</span>
          <span 
            className="text-2xl font-bold text-[#FFE394] mt-1 block"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {totalDonationsCount}
          </span>
          <span className="text-[10px] text-[#A69371] mt-1 block">Connected donations</span>
        </Card>
        <Card className="p-4 bg-[#05142B]/90 border border-[#3A2C18] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:border-[#C5A059]/60 transition-all">
          <span className="text-xs text-[#C6B697] block">Total Raised via Tools</span>
          <span 
            className="text-2xl font-bold text-emerald-400 mt-1 block"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            ${(totalRaisedCents / 100).toLocaleString()}
          </span>
          <span className="text-[10px] text-[#A69371] mt-1 block">100% connected data</span>
        </Card>
        <Card className="p-4 bg-[#05142B]/90 border border-[#3A2C18] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:border-[#C5A059]/60 transition-all">
          <span className="text-xs text-[#C6B697] block">Connected Funds</span>
          <span 
            className="text-2xl font-bold text-[#FFF4D4] mt-1 block"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            3 Funds
          </span>
          <span className="text-[10px] text-[#FAD77B] mt-1 block">Real-time balances</span>
        </Card>
      </div>

      {/* Controls & Search */}
      <Card className="p-3.5 bg-[#030D1C]/90 border border-[#3A2C18] rounded-xl shadow-inner">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative w-full sm:w-64 lg:w-72 shrink-0">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#A69371]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tools by name, slug, or fund..."
              className="bg-[#010814] border-[#3A2C18] text-[#FFF4D4] placeholder:text-[#A69371]/60 pl-8 text-xs h-8 rounded-lg focus-visible:ring-[#C5A059]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
            {/* Type Filters */}
            <div className="flex items-center gap-0.5 bg-[#010814] p-1 rounded-lg border border-[#3A2C18] text-xs overflow-x-auto max-w-full">
              {[
                { id: "all", label: "All Types" },
                { id: "donation_form", label: "Forms" },
                { id: "campaign_page", label: "Campaigns" },
                { id: "donate_button", label: "Buttons" },
                { id: "floating_button", label: "Floating" },
                { id: "progress_bar", label: "Goals" },
                { id: "supporter_signup", label: "Signups" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setTypeFilter(f.id)}
                  className={`px-2 py-1 rounded-md transition-all text-[11px] whitespace-nowrap cursor-pointer ${
                    typeFilter === f.id
                      ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-sm"
                      : "text-[#C6B697] hover:text-[#FFF4D4]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-0.5 bg-[#010814] p-1 rounded-lg border border-[#3A2C18] text-xs shrink-0">
              {["all", "active", "draft", "archived"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2 py-1 rounded-md text-[11px] capitalize cursor-pointer transition-all ${
                    statusFilter === s
                      ? "bg-[#C5A059]/25 text-[#FFE394] font-semibold border border-[#C5A059]/40"
                      : "text-[#A69371] hover:text-[#FFF4D4]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Tools Cards Grid */}
      {isLoading ? (
        <div className="text-center py-16 text-[#C6B697] text-sm">Loading website fundraising tools...</div>
      ) : tools.length === 0 ? (
        <Card className="p-12 bg-[#05142B]/90 border border-[#3A2C18] rounded-xl text-center space-y-3 shadow-[0_8px_24px_rgba(0,0,0,0.85)]">
          <div className="h-12 w-12 rounded-full bg-[#0B2144] border border-[#C5A059]/40 flex items-center justify-center text-[#FAD77B] mx-auto shadow-inner">
            <Globe className="h-6 w-6" />
          </div>
          <h3 
            className="text-base font-bold text-[#FFF4D4]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            No Website Tools Found
          </h3>
          <p className="text-xs text-[#C6B697] max-w-sm mx-auto">
            {search || typeFilter !== "all"
              ? "Try adjusting your search query or filters to locate website fundraising widgets."
              : "Create your first donation form, campaign page, or donate button to launch on your public website."}
          </p>
          <Button
            onClick={() => {
              setToolToEdit(null);
              setCreateModalOpen(true);
            }}
            className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-bold text-xs h-9 px-4 shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5] mr-1" /> Create Tool Now
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool: any) => {
            const Icon = TYPE_ICONS[tool.type] || FileText;
            const typeLabel = TYPE_LABELS[tool.type] || tool.type;

            return (
              <Card
                key={tool.id}
                className="overflow-hidden bg-[#05142B]/90 border border-[#3A2C18] hover:border-[#C5A059]/60 transition-all rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] flex flex-col justify-between"
              >
                {/* Card Header & Mini Widget Preview */}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-2 rounded-lg bg-[#010814] border border-[#3A2C18] text-[#FAD77B] shadow-inner shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <Badge variant="outline" className="text-[10px] text-[#D8C7A5] border-[#3A2C18] bg-[#020A17] font-medium truncate">
                        {typeLabel}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Badge
                        className={`text-[10px] font-semibold capitalize ${
                          tool.status === "active"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : tool.status === "draft"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-white/10 text-white/50 border border-white/20"
                        }`}
                      >
                        {tool.status}
                      </Badge>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-[#A69371] hover:text-[#FFF4D4] hover:bg-[#07162B]">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] text-xs">
                          <DropdownMenuItem
                            onClick={() => {
                              setToolToEdit(tool);
                              setCreateModalOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-2" /> Edit Settings
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(tool)}>
                            <Archive className="h-3.5 w-3.5 mr-2" />
                            {tool.status === "active" ? "Archive Tool" : "Activate Tool"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-[#3A2C18]" />
                          <DropdownMenuItem
                            onClick={() => {
                              if (confirm(`Delete tool "${tool.name}"? Past donation records will not be deleted.`)) {
                                deleteToolMutation.mutate({ id: tool.id });
                              }
                            }}
                            className="text-rose-400 focus:text-rose-300"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Tool
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div>
                    <h3
                      className="text-base font-bold text-[#FFF4D4] tracking-tight leading-snug truncate"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                      title={tool.name}
                    >
                      {tool.name}
                    </h3>
                    <p className="text-xs text-[#C6B697] line-clamp-1 mt-0.5">
                      {tool.description || tool.headline}
                    </p>
                  </div>

                  {/* ── LIVE MINI WIDGET VISUAL PREVIEW ── */}
                  <MiniWidgetPreview
                    tool={tool}
                    onClick={() => {
                      setToolToPreview(tool);
                      setPreviewModalOpen(true);
                    }}
                  />

                  {/* Connected Fund & Dynamic Metrics Row */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-[#A69371]">
                      <Landmark className="h-3.5 w-3.5 text-[#FAD77B] shrink-0" />
                      <span className="truncate">{tool.fundName}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-[#020A17]/80 border border-[#3A2C18]/60 px-2.5 py-2 rounded-lg">
                        <span className="text-[10px] text-[#A69371] block truncate">Amount Raised</span>
                        <span className="font-bold text-emerald-400 font-mono text-sm">
                          ${((tool.amountRaisedCents || 0) / 100).toLocaleString()}
                        </span>
                      </div>
                      <div className="bg-[#020A17]/80 border border-[#3A2C18]/60 px-2.5 py-2 rounded-lg">
                        <span className="text-[10px] text-[#A69371] block truncate">Gifts Generated</span>
                        <span className="font-bold text-[#FFF4D4] font-mono text-sm">
                          {tool.donationsGeneratedCount || 0} donations
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions — Equal 4-Button Grid so buttons NEVER overlap or clip at 100% zoom */}
                <div className="p-2.5 bg-[#020A17]/95 border-t border-[#3A2C18]/80 grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setToolToPreview(tool);
                      setPreviewModalOpen(true);
                    }}
                    className="h-7.5 px-2 rounded-lg border border-[#3A2C18]/80 bg-[#05142B]/80 hover:bg-[#0A2246] hover:border-[#C5A059]/60 text-[11px] font-medium text-[#D8C7A5] hover:text-[#FFF4D4] flex items-center justify-center gap-1 transition-all cursor-pointer min-w-0"
                    title="Interactive Device Preview"
                  >
                    <Eye className="h-3.5 w-3.5 text-[#FAD77B] shrink-0" />
                    <span className="truncate">Preview</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setToolToEdit(tool);
                      setCreateModalOpen(true);
                    }}
                    className="h-7.5 px-2 rounded-lg border border-[#3A2C18]/80 bg-[#05142B]/80 hover:bg-[#0A2246] hover:border-[#C5A059]/60 text-[11px] font-medium text-[#D8C7A5] hover:text-[#FFF4D4] flex items-center justify-center gap-1 transition-all cursor-pointer min-w-0"
                    title="Edit Widget Settings"
                  >
                    <Pencil className="h-3.5 w-3.5 text-[#C5A059] shrink-0" />
                    <span className="truncate">Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyLink(tool)}
                    className="h-7.5 px-2 rounded-lg border border-[#3A2C18]/80 bg-[#05142B]/80 hover:bg-[#0A2246] hover:border-[#C5A059]/60 text-[11px] font-medium text-[#D8C7A5] hover:text-[#FFF4D4] flex items-center justify-center gap-1 transition-all cursor-pointer min-w-0"
                    title="Copy Public Share Link"
                  >
                    <Copy className="h-3.5 w-3.5 text-[#C6B697] shrink-0" />
                    <span className="truncate">Copy Link</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setToolToShare(tool);
                      setShareModalOpen(true);
                    }}
                    className="h-7.5 px-2 rounded-lg bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-bold border border-[#FFE394]/60 text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm min-w-0"
                    title="Get Website Embed Code & QR"
                  >
                    <Share2 className="h-3.5 w-3.5 stroke-[2.5] shrink-0" />
                    <span className="truncate">Embed</span>
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CreateEditWebsiteToolModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        toolToEdit={toolToEdit}
        onSaved={() => utils.giving.listWebsiteTools.invalidate()}
      />

      <WebsiteToolPreviewModal
        open={previewModalOpen}
        onOpenChange={setPreviewModalOpen}
        tool={toolToPreview}
      />

      <ShareWebsiteToolModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        tool={toolToShare}
      />
    </GivingPageLayout>
  );
}
