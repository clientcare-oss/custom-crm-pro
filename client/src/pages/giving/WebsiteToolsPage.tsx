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
      <Card className="p-4 bg-[#030D1C]/90 border border-[#3A2C18] rounded-xl shadow-inner space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#A69371]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tools by name, slug, or fund..."
              className="bg-[#010814] border-[#3A2C18] text-[#FFF4D4] placeholder:text-[#A69371]/60 pl-9 text-xs h-9 rounded-lg focus-visible:ring-[#C5A059]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Type Filters */}
            <div className="flex items-center gap-1 bg-[#010814] p-1 rounded-lg border border-[#3A2C18] text-xs overflow-x-auto max-w-full">
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
                  className={`px-2.5 py-1 rounded-md transition-all text-xs whitespace-nowrap cursor-pointer ${
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
            <div className="flex items-center gap-1 bg-[#010814] p-1 rounded-lg border border-[#3A2C18] text-xs">
              {["all", "active", "draft", "archived"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2 py-1 rounded-md text-xs capitalize cursor-pointer transition-all ${
                    statusFilter === s ? "bg-[#C5A059]/25 text-[#FFE394] font-semibold border border-[#C5A059]/40" : "text-[#A69371] hover:text-[#FFF4D4]"
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
                {/* Card Header */}
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-[#010814] border border-[#3A2C18] text-[#FAD77B] shadow-inner">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <Badge variant="outline" className="text-[10px] text-[#D8C7A5] border-[#3A2C18] bg-[#020A17] font-medium">
                          {typeLabel}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Badge
                        className={`text-[10px] font-semibold ${
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
                      className="text-base font-bold text-[#FFF4D4] tracking-tight leading-snug"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      {tool.name}
                    </h3>
                    <p className="text-xs text-[#C6B697] line-clamp-2 mt-1">{tool.description || tool.headline}</p>
                  </div>

                  {/* Connected Fund Badge */}
                  <div className="flex items-center gap-1.5 text-xs text-[#A69371] pt-1">
                    <Landmark className="h-3.5 w-3.5 text-[#FAD77B]" />
                    <span className="truncate">{tool.fundName}</span>
                  </div>

                  {/* Dynamic Metrics Row */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#3A2C18]/60 text-xs">
                    <div className="bg-[#020A17]/80 border border-[#3A2C18]/60 p-2.5 rounded-lg">
                      <span className="text-[10px] text-[#A69371] block">Amount Raised</span>
                      <span className="font-bold text-emerald-400 font-mono text-sm">
                        ${((tool.amountRaisedCents || 0) / 100).toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-[#020A17]/80 border border-[#3A2C18]/60 p-2.5 rounded-lg">
                      <span className="text-[10px] text-[#A69371] block">Gifts Generated</span>
                      <span className="font-bold text-[#FFF4D4] font-mono text-sm">
                        {tool.donationsGeneratedCount || 0} donations
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-3 bg-[#020A17]/90 border-t border-[#3A2C18]/80 flex items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setToolToPreview(tool);
                        setPreviewModalOpen(true);
                      }}
                      className="h-7 text-xs text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#07162B] px-2 rounded-md"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1 text-[#FAD77B]" /> Preview
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setToolToEdit(tool);
                        setCreateModalOpen(true);
                      }}
                      className="h-7 text-xs text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#07162B] px-2 rounded-md"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1 text-[#C5A059]" /> Edit
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopyLink(tool)}
                      className="h-7 text-xs text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#07162B] px-2 rounded-md"
                      title="Copy Public URL"
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" /> Copy Link
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setToolToShare(tool);
                        setShareModalOpen(true);
                      }}
                      className="h-7 text-xs bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-bold border border-[#FFE394]/50 px-2.5 rounded-md shadow-xs"
                    >
                      <Share2 className="h-3.5 w-3.5 mr-1 stroke-[2.5]" /> Embed
                    </Button>
                  </div>
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
